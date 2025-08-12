/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ILogger } from 'src/shared/logger';
import { IUserToken } from 'src/shared/auth';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMaker } from '../../domain/entities';
import {
  MakerDomainException,
  MakerExceptionMessage,
} from '../../domain/exceptions';
import { IEvent } from '@nestjs/cqrs';
import { Maker } from '../../domain/aggregates';
import {
  EventOrchestrationService,
  SnapshotService,
} from 'src/shared/infrastructure/event-store';
import { MakerMemoryProjection } from '../projectors';
import { MakerCreatedEvent, MakerUpdatedEvent } from '../../domain/events';
import {
  ListMakerOrderEnum,
  ListMakerPropsOptions,
  MakerPage,
  SnapshotMakerProps,
} from '../../domain/properties';
import { MakerProjectionKeys } from '../../domain/value-objects/maker-projection-keys';
import { DomainEvent, ISagaContext } from 'src/shared/domain';
import { SagaCommandRepository } from 'src/shared/infrastructure/repositories';
import {
  CoreMakerLoggingHelper,
  CoreMakerServiceConstants,
} from '../../../shared/domain/value-objects';

const COMPONENT_NAME = 'MakerRepository';

export class MakerRepository extends SagaCommandRepository<
  IMaker,
  Maker,
  typeof MakerExceptionMessage
> {
  private static readonly SERVICE_NAME = CoreMakerServiceConstants.SERVICE_NAME;

  constructor(
    protected readonly configService: ConfigService,
    @Inject('ILogger') protected readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly snapshotService: SnapshotService,

    @Inject('MakerMemoryProjection')
    private readonly makerProjection: MakerMemoryProjection,
  ) {
    super(configService, logger, MakerExceptionMessage, Maker);
  }

  /**
   * Generates entity-level stream name following: <context>.<aggregate>.<version>-<tenant>-<entityId>
   * Each maker gets its own stream for optimal performance
   * Example: banking.maker.v1-tenant123-USD
   */
  private buildStreamName(tenant: string, makerCode: string): string {
    return MakerProjectionKeys.getEventStoreStreamName(tenant, makerCode);
  }

  protected getCreateEvent(user: IUserToken, aggregate: Maker): IEvent {
    return new MakerCreatedEvent(user, aggregate.getId(), aggregate.toDto());
  }

  protected getUpdateEvent(user: IUserToken, aggregate: Maker): IEvent {
    return new MakerUpdatedEvent(user, aggregate.getId(), aggregate.toDto());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getDeleteEvent(user: IUserToken, aggregate: Maker): IEvent {
    throw new MakerDomainException(MakerExceptionMessage.notImplemented);
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement the get method from SagaCommandRepository
  protected async get(
    user: IUserToken,
    identifier: string | number,
  ): Promise<IMaker | undefined> {
    const id = identifier.toString();
    const tenant = user.tenant;
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'get',
      id,
      user,
    );

    this.logger.debug(logContext, `Getting maker by id: ${id}`);

    try {
      // Get maker from EventStore using entity-level stream (one stream per maker)
      const streamName = this.buildStreamName(tenant || '', id);

      // Try to get the latest snapshot first using the specialized service
      const snapshot =
        await this.snapshotService.getLatestSnapshot<SnapshotMakerProps>(
          streamName,
        );

      if (!snapshot) {
        return undefined; // Not found
      }

      // Use the helper method for hydration
      const maker = this.hydrateStoredMaker(user, snapshot, logContext);

      this.logger.debug(logContext, `Successfully retrieved maker: ${id}`);
      return maker;
    } catch (e) {
      this.logger.error(
        {
          ...logContext,
          id,
          tenant,
          username: user?.preferred_username,
          error: e instanceof Error ? e.message : 'Unknown error',
        },
        'Maker get error',
      );

      return undefined; // Not found on error
    }
  }

  async getMaker(user: IUserToken, id: string): Promise<IMaker> {
    const result = await this.get(user, id);
    if (!result) {
      throw new MakerDomainException(MakerExceptionMessage.notFound);
    }
    return result;
  }

  /**
   * ✅ CLEAN: Repository delegates aggregate creation to domain factory
   * No knowledge of internal domain structure required
   */
  protected createAggregate(user: IUserToken, entity: IMaker): Maker {
    return Maker.fromEntity(entity);
  }

  async list(
    user: IUserToken,
    pageOptions: ListMakerPropsOptions = {},
  ): Promise<MakerPage> {
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'list',
      `page:${pageOptions.page || 1}`,
      user,
    );

    this.logger.debug(
      logContext,
      `Listing makers with options: ${JSON.stringify(pageOptions)}`,
    );

    try {
      // Check if we have the projection available and initialized
      if (this.makerProjection.isReady()) {
        return this.listFromProjection(user, pageOptions, logContext);
      } else {
        // Log error and throw - projection should be available
        this.logger.error(
          logContext,
          'Maker projection is not available or not ready. Cannot list makers without projection.',
        );
        throw new MakerDomainException(
          MakerExceptionMessage.projectionNotAvailable ||
            MakerExceptionMessage.notFound,
        );
      }
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          pageOptions,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to list Makers',
      );

      if (error instanceof MakerDomainException) {
        throw error;
      }

      throw new MakerDomainException(MakerExceptionMessage.notFound);
    }
  }

  /**
   * List makers using the in-memory projection for optimal performance
   */
  private async listFromProjection(
    user: IUserToken,
    pageOptions: ListMakerPropsOptions,
    logContext: Record<string, unknown>,
  ): Promise<MakerPage> {
    this.logger.debug(logContext, 'Using maker projection for listing');

    // Build filter from page options with proper typing
    const filter: {
      to?: string;
    } = {};

    if (pageOptions.to) {
      filter.to = pageOptions.to;
    }

    // Get makers from projection with proper null check
    const projectionMakers = await this.makerProjection.getMakersForTenant(
      user.tenant || '',
      filter,
    );

    // Apply sorting
    const sortedMakers = [...projectionMakers];
    if (pageOptions.orderBy) {
      sortedMakers.sort((a, b) => {
        const field = pageOptions.orderBy! as keyof SnapshotMakerProps;
        const aValue = a[field];
        const bValue = b[field];

        // Handle different types safely
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue);
        }

        // Convert to string for comparison, handling objects
        const aStr =
          aValue === null || aValue === undefined
            ? ''
            : typeof aValue === 'object'
              ? JSON.stringify(aValue)
              : String(aValue);
        const bStr =
          bValue === null || bValue === undefined
            ? ''
            : typeof bValue === 'object'
              ? JSON.stringify(bValue)
              : String(bValue);

        return aStr.localeCompare(bStr);
      });
    }

    // Apply pagination
    const page = pageOptions.page || 1;
    const size = pageOptions.size || 20;
    const skip = (page - 1) * size;

    const paginatedMakers = sortedMakers.slice(skip, skip + size);

    // Convert to ListMakerProps format
    const items = await Promise.all(
      paginatedMakers.map(
        async (maker) => await this.hydrateStoredMaker(user, maker, logContext),
      ),
    );

    // Create proper IListMeta
    const meta = {
      page,
      size,
      itemCount: sortedMakers.length,
      pageCount: Math.ceil(sortedMakers.length / size),
      hasPreviousPage: page > 1,
      hasNextPage: page < Math.ceil(sortedMakers.length / size),
    };

    const makerPage = new MakerPage(items, meta);

    this.logger.debug(
      logContext,
      `Successfully listed ${items.length}/${sortedMakers.length} makers from projection (page ${page}/${meta.pageCount})`,
    );

    return makerPage;
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement save method from SagaCommandRepository
  protected async save(
    user: IUserToken,
    data: Maker,
    sagaContext?: ISagaContext,
  ): Promise<IMaker> {
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForOperation,
      );
    }
    if (!data || !data.id) {
      throw new MakerDomainException(MakerExceptionMessage.fieldCodeRequired);
    }

    const tenant = user.tenant;
    const makerCode = data.getId(); // Convert MakerIdentifier to string
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'save',
      makerCode,
      user,
    );

    // Add saga context to logging
    if (sagaContext) {
      Object.assign(logContext, {
        sagaId: sagaContext.sagaId,
        correlationId: sagaContext.correlationId,
        operationId: sagaContext.operationId,
        isRetry: sagaContext.isRetry || false,
      });
    }

    this.logger.debug(logContext, `Saving maker: ${makerCode}`);

    try {
      // ✅ EVENT SOURCING: Use proper tenant-specific stream naming with new DDD convention
      const streamName = this.buildStreamName(tenant || '', makerCode);

      // ✅ SAGA-FRIENDLY: Check for idempotency using saga context
      if (sagaContext) {
        const existingEvent = await this.checkSagaOperationExists(
          streamName,
          makerCode,
          sagaContext.operationId,
        );

        if (existingEvent) {
          this.logger.debug(
            logContext,
            `Saga operation already completed for maker: ${makerCode}`,
          );
          // Return existing result instead of duplicate operation
          const existing = await this.get(user, makerCode);
          if (existing) {
            return existing;
          }
        }
      }

      // ✅ EVENT SOURCING: Get uncommitted events from aggregate (proper pattern)
      const uncommittedEvents = data.getUncommittedEvents();

      if (!uncommittedEvents || uncommittedEvents.length === 0) {
        this.logger.debug(
          logContext,
          `No uncommitted events for maker: ${makerCode}, returning current state`,
        );
        return data.toDto();
      }

      // ✅ SAGA-FRIENDLY: Add saga metadata to events if needed
      if (sagaContext) {
        uncommittedEvents.forEach((event) => {
          // Add saga metadata for EventStore serialization
          Object.assign(event, {
            _sagaMetadata: {
              sagaId: sagaContext.sagaId,
              correlationId: sagaContext.correlationId,
              operationId: sagaContext.operationId,
              timestamp: new Date().toISOString(),
              isCompensation: false,
            },
          });
        });
      }

      // ✅ EVENT SOURCING: Append the domain events to stream
      // Type-safe conversion: IEvent[] from NestJS CQRS to DomainEvent[] for EventStore
      const domainEvents = uncommittedEvents.filter(
        (event): event is DomainEvent => event instanceof DomainEvent,
      );

      if (domainEvents.length !== uncommittedEvents.length) {
        this.logger.warn(
          logContext,
          `Some events are not DomainEvents: expected ${uncommittedEvents.length}, got ${domainEvents.length}`,
        );
      }

      // ✅ DECLARATIVE: Pass stream metadata from Repository constants
      const streamMetadata = {
        context: MakerProjectionKeys.ESDB_BOUNDED_CONTEXT,
        aggregateType: MakerProjectionKeys.ESDB_AGGREGATE_NAME,
        version: MakerProjectionKeys.ESDB_VERSION,
        service: MakerRepository.SERVICE_NAME,
        correlationId: sagaContext?.correlationId,
        causationId: sagaContext?.operationId, // Using operationId as causationId
      };

      await this.eventOrchestration.appendDomainEventsToStream(
        streamName,
        domainEvents,
        streamMetadata, // ✅ Pass declarative metadata from Repository
      );

      // ✅ EVENT SOURCING: Mark events as committed
      data.commit();

      this.logger.debug(
        logContext,
        `Successfully saved maker: ${makerCode} with ${uncommittedEvents.length} events`,
      );

      // ✅ SAGA-FRIENDLY: Return aggregate data directly instead of querying
      // This avoids read-after-write consistency issues in sagas
      return data.toDto();
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          tenant,
          makerCode,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to save maker',
      );

      if (error instanceof MakerDomainException) {
        throw error;
      }

      throw new MakerDomainException(MakerExceptionMessage.updateError);
    }
  }

  // Helper method to rebuild maker from events
  private rebuildMakerFromEvents(
    events: DomainEvent[],
    snapshot?: SnapshotMakerProps,
  ): SnapshotMakerProps {
    if (snapshot) {
      return snapshot;
    } else {
      // Type-safe event processing - look for MakerCreatedEvent
      throw new Error('No maker creation event found in stream');
    }
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement compensate method from SagaCommandRepository
  protected async compensate(
    user: IUserToken,
    identifier: string | number,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const makerCode = identifier.toString();
    await this.compensateSave(user, makerCode, sagaContext);
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement checkSagaOperationExists from SagaCommandRepository
  protected checkSagaOperationExists(
    streamName: string,
    key: string,
    operationId: string,
  ): Promise<boolean> {
    try {
      // This would check the event stream for events with the same operationId
      // Implementation depends on your EventStore capabilities
      // For now, returning false to allow the operation
      return Promise.resolve(false);
    } catch (error) {
      this.logger.warn(
        { streamName, key, operationId, error },
        'Failed to check saga operation existence',
      );
      return Promise.resolve(false);
    }
  }

  // ✅ SAGA-FRIENDLY: Method for saga compensation (rollback)
  async compensateSave(
    user: IUserToken,
    makerCode: string,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'compensateSave',
      makerCode,
      user,
    );

    Object.assign(logContext, {
      sagaId: sagaContext.sagaId,
      correlationId: sagaContext.correlationId,
      operationId: sagaContext.operationId,
    });

    this.logger.debug(
      logContext,
      `Compensating save operation for maker: ${makerCode}`,
    );

    try {
      const streamName = this.buildStreamName(user.tenant || '', makerCode);

      // Create compensation event
      const compensationEvent = {
        id: makerCode,
        eventType: 'MakerUpdateCompensated',
        _sagaMetadata: {
          sagaId: sagaContext.sagaId,
          correlationId: sagaContext.correlationId,
          operationId: sagaContext.operationId,
          originalOperationId: sagaContext.operationId,
          timestamp: new Date().toISOString(),
          isCompensation: true,
        },
      };

      // TODO: Implement with eventOrchestration.appendDomainEventsToStream
      // await this.eventOrchestration.appendDomainEventsToStream(streamName, [compensationEvent]);
      throw new Error('compensateSave not yet implemented with new services');

      this.logger.debug(
        logContext,
        `Successfully compensated save operation for maker: ${makerCode}`,
      );
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          makerCode,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to compensate save operation',
      );
      throw error;
    }
  }

  async saveMaker(
    user: IUserToken,
    data: Maker,
    sagaContext?: ISagaContext,
  ): Promise<IMaker> {
    return await this.save(user, data, sagaContext);
  }

  /**
   * Hydrates a Maker to a complete IMaker domain object.
   * This abstraction supports multiple data sources: EventStore snapshots,
   * rebuilt events, SQL projections, or Redis fallback during migration.
   * @private
   */
  private async hydrateStoredMaker(
    user: IUserToken,
    storedMaker: SnapshotMakerProps,
    logContext: Record<string, unknown>,
  ): Promise<IMaker> {
    try {
      // Construct the complete domain object
      return Promise.resolve({
        id: storedMaker.id,
        from: storedMaker.from,
        to: storedMaker.to,
        description: storedMaker.description,
        amount: storedMaker.amount,
        status: storedMaker.status,
        scheduledAt: storedMaker.scheduledAt,
        correlationId: storedMaker.correlationId,
      });
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          makerCode: storedMaker.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to hydrate maker entity: ${storedMaker.id}`,
      );
      throw error;
    }
  }
}
