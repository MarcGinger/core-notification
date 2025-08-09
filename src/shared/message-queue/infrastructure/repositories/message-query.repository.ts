/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEvent } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { DomainEvent, ISagaContext } from 'src/shared/domain';
import {
  EventOrchestrationService,
  SnapshotService,
} from 'src/shared/infrastructure/event-store';
import { SagaCommandRepository } from 'src/shared/infrastructure/repositories';
import { ILogger } from 'src/shared/logger';

import { MessageQueue } from '../../domain/aggregates';
import { IMessageQueue } from '../../domain/entities';
import { MessageQueueCreatedEvent } from '../../domain/events';
import {
  MessageQueueDomainException,
  MessageQueueExceptionMessageQueue,
} from '../../domain/exceptions';
import { SnapshotMessageQueueProps } from '../../domain/properties';
import {
  MessageQueueProjectionKeys,
  MessageQueueWorkerLoggingHelper,
  MessageQueueWorkerServiceConstants,
} from '../../domain/value-objects';

const COMPONENT_NAME = 'MessageQueueRepository';

export class MessageQueueRepository extends SagaCommandRepository<
  IMessageQueue,
  MessageQueue,
  typeof MessageQueueExceptionMessageQueue
> {
  private static readonly SERVICE_NAME =
    MessageQueueWorkerServiceConstants.SERVICE_NAME;

  constructor(
    protected readonly configService: ConfigService,
    @Inject('ILogger') protected readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly snapshotService: SnapshotService,
  ) {
    super(
      configService,
      logger,
      MessageQueueExceptionMessageQueue,
      MessageQueue,
    );
  }

  /**
   * Generates entity-level stream name following: <context>.<aggregate>.<version>-<tenant>-<entityId>
   * Each message gets its own stream for optimal performance
   * Example: banking.message.v1-tenant123-USD
   */
  private buildStreamName(tenant: string, messageCode: string): string {
    return MessageQueueProjectionKeys.getEventStoreStreamName(
      tenant,
      messageCode,
    );
  }

  protected getCreateEvent(user: IUserToken, aggregate: MessageQueue): IEvent {
    return new MessageQueueCreatedEvent(
      user,
      aggregate.getId(),
      aggregate.toDto(),
    );
  }

  protected getUpdateEvent(user: IUserToken, aggregate: MessageQueue): IEvent {
    throw new MessageQueueDomainException(
      MessageQueueExceptionMessageQueue.notImplemented,
    );
  }

  protected getDeleteEvent(user: IUserToken, aggregate: MessageQueue): IEvent {
    throw new MessageQueueDomainException(
      MessageQueueExceptionMessageQueue.notImplemented,
    );
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement the get method from SagaCommandRepository
  protected async get(
    user: IUserToken,
    identifier: string | number,
  ): Promise<IMessageQueue | undefined> {
    const id = identifier.toString();
    const tenant = user.tenant;
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'get',
      id,
      user,
    );

    this.logger.debug(logContext, `Getting message by id: ${id}`);

    try {
      // Get message from EventStore using entity-level stream (one stream per message)
      const streamName = this.buildStreamName(tenant || '', id);

      // Try to get the latest snapshot first using the specialized service
      const snapshot =
        await this.snapshotService.getLatestSnapshot<SnapshotMessageQueueProps>(
          streamName,
        );

      if (!snapshot) {
        return undefined; // Not found
      }

      // Use the helper method for hydration
      const message = this.hydrateStoredMessageQueue(
        user,
        snapshot,
        logContext,
      );

      this.logger.debug(logContext, `Successfully retrieved message: ${id}`);
      return message;
    } catch (e) {
      this.logger.error(
        {
          ...logContext,
          id,
          tenant,
          username: user?.preferred_username,
          error: e instanceof Error ? e.message : 'Unknown error',
        },
        'MessageQueue get error',
      );

      return undefined; // Not found on error
    }
  }

  async getMessageQueue(user: IUserToken, id: string): Promise<IMessageQueue> {
    const result = await this.get(user, id);
    if (!result) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.notFound,
      );
    }
    return result;
  }

  /**
   * ✅ CLEAN: Repository delegates aggregate creation to domain factory
   * No knowledge of internal domain structure required
   */
  protected createAggregate(
    user: IUserToken,
    entity: IMessageQueue,
  ): MessageQueue {
    return MessageQueue.fromEntity(entity);
  }
  // ✅ REQUIRED ABSTRACT METHOD: Implement save method from SagaCommandRepository
  protected async save(
    user: IUserToken,
    data: MessageQueue,
    sagaContext?: ISagaContext,
  ): Promise<IMessageQueue> {
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForOperation,
      );
    }
    if (!data || !data.id) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.fieldCodeRequired,
      );
    }

    const tenant = user.tenant;
    const messageCode = data.getId(); // Convert MessageQueueIdentifier to string
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'save',
      messageCode,
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

    this.logger.debug(logContext, `Saving message: ${messageCode}`);

    try {
      // ✅ EVENT SOURCING: Use proper tenant-specific stream naming with new DDD convention
      const streamName = this.buildStreamName(tenant || '', messageCode);

      // ✅ SAGA-FRIENDLY: Check for idempotency using saga context
      if (sagaContext) {
        const existingEvent = await this.checkSagaOperationExists(
          streamName,
          messageCode,
          sagaContext.operationId,
        );

        if (existingEvent) {
          this.logger.debug(
            logContext,
            `Saga operation already completed for message: ${messageCode} - returning existing result`,
          );
          // Return existing result instead of duplicate operation
          const existing = await this.get(user, messageCode);
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
          `No uncommitted events for message: ${messageCode}, returning current state`,
        );
        return data.toDto();
      }

      // ✅ SAGA-FRIENDLY: Add saga metadata to events if needed
      if (sagaContext) {
        // Create copies of events to avoid mutation of original domain events
        const eventsWithSagaMetadata = uncommittedEvents.map((event) => {
          // Create a copy and add saga metadata
          const eventCopy = { ...event };
          Object.assign(eventCopy, {
            _sagaMetadata: {
              sagaId: sagaContext.sagaId,
              correlationId: sagaContext.correlationId,
              operationId: sagaContext.operationId,
              timestamp: new Date().toISOString(),
              isCompensation: false,
            },
          });
          return eventCopy;
        });

        // Use the events with saga metadata
        uncommittedEvents.splice(
          0,
          uncommittedEvents.length,
          ...eventsWithSagaMetadata,
        );
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
        context: MessageQueueProjectionKeys.ESDB_BOUNDED_CONTEXT,
        aggregateType: MessageQueueProjectionKeys.ESDB_AGGREGATE_NAME,
        version: MessageQueueProjectionKeys.ESDB_VERSION,
        service: MessageQueueRepository.SERVICE_NAME,
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
        `Successfully saved message: ${messageCode} with ${uncommittedEvents.length} events`,
      );

      // ✅ SAGA-FRIENDLY: Return aggregate data directly instead of querying
      // This avoids read-after-write consistency issues in sagas
      return data.toDto();
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          tenant,
          messageCode,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to save message',
      );

      if (error instanceof MessageQueueDomainException) {
        throw error;
      }

      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.updateError,
      );
    }
  }

  // Helper method to rebuild message from events
  private rebuildMessageQueueFromEvents(
    events: DomainEvent[],
    snapshot?: SnapshotMessageQueueProps,
  ): SnapshotMessageQueueProps {
    if (snapshot) {
      return snapshot;
    } else {
      // Type-safe event processing - look for MessageQueueCreatedEvent
      throw new Error('No message creation event found in stream');
    }
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement compensate method from SagaCommandRepository
  protected async compensate(
    user: IUserToken,
    identifier: string | number,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const messageCode = identifier.toString();
    await this.compensateSave(user, messageCode, sagaContext);
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement checkSagaOperationExists from SagaCommandRepository
  protected async checkSagaOperationExists(
    streamName: string,
    key: string,
    operationId: string,
  ): Promise<boolean> {
    try {
      // Read events from the stream to check for existing operations
      const events =
        await this.eventOrchestration.readDomainEventsFromStream(streamName);

      // Check if any event has the same operationId in saga metadata
      const existingOperation = events.some((event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sagaMetadata = (event as any)?._sagaMetadata;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return sagaMetadata?.operationId === operationId;
      });

      if (existingOperation) {
        this.logger.debug(
          { streamName, key, operationId },
          'Saga operation already exists in stream - preventing duplicate',
        );
      }

      return existingOperation;
    } catch (error) {
      this.logger.warn(
        { streamName, key, operationId, error },
        'Failed to check saga operation existence - allowing operation to proceed',
      );
      return false; // Allow operation on error
    }
  }

  // ✅ SAGA-FRIENDLY: Method for saga compensation (rollback)
  async compensateSave(
    user: IUserToken,
    messageCode: string,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'compensateSave',
      messageCode,
      user,
    );

    Object.assign(logContext, {
      sagaId: sagaContext.sagaId,
      correlationId: sagaContext.correlationId,
      operationId: sagaContext.operationId,
    });

    this.logger.debug(
      logContext,
      `Compensating save operation for message: ${messageCode}`,
    );

    try {
      const streamName = this.buildStreamName(user.tenant || '', messageCode);

      // Create compensation event
      const compensationEvent = {
        id: messageCode,
        eventType: 'MessageQueueUpdateCompensated',
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
        `Successfully compensated save operation for message: ${messageCode}`,
      );
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          messageCode,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to compensate save operation',
      );
      throw error;
    }
  }

  async saveMessageQueue(
    user: IUserToken,
    data: MessageQueue,
    sagaContext?: ISagaContext,
  ): Promise<IMessageQueue> {
    return await this.save(user, data, sagaContext);
  }

  async delete(user: IUserToken, identifier: string): Promise<void> {
    const startTime = Date.now();
    const code = identifier;
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'delete',
      code,
      user,
    );

    this.logger.debug(
      logContext,
      `Delete operation started for message: ${code}`,
    );

    try {
      // Use the new entity-level stream naming convention
      const streamName = this.buildStreamName(user.tenant || '', code);

      // First, verify the message exists and get the aggregate
      const aggregate = await this.get(user, code);
      if (!aggregate) {
        throw new MessageQueueDomainException(
          MessageQueueExceptionMessageQueue.notFound,
        );
      }

      // Create a delete event using the new stream
      // TODO: Implement proper domain event creation and append to stream
      // For now, throw a descriptive error with the stream name
      throw new Error(
        `delete method not yet implemented with new services. Stream: ${streamName}`,
      );

      // Planned implementation:
      // 1. Create MessageQueue aggregate from existing data
      // 2. Call markForDeletion() on the aggregate to generate delete event
      // 3. Use eventOrchestration.appendDomainEventsToStream(streamName, events)
      // 4. Commit the events

      const duration = Date.now() - startTime;
      this.logger.debug(
        {
          ...logContext,
          duration,
          messageCode: code,
        },
        `Successfully deleted message: ${code}`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorContext = this.createErrorContext(
        logContext,
        error as Error,
        duration,
      );
      const errorMessageQueue = this.extractErrorMessage(
        error,
        MessageQueueExceptionMessageQueue.deleteError,
      );

      this.logger.error(
        {
          ...errorContext,
          messageCode: code,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to delete message: ${code}`,
      );

      this.handleError(
        error as Error,
        user,
        errorContext,
        errorMessageQueue,
        duration,
      );
    }
  }

  /**
   * Hydrates a MessageQueue to a complete IMessageQueue domain object.
   * This abstraction supports multiple data sources: EventStore snapshots,
   * rebuilt events, SQL projections, or Redis fallback during migration.
   * @private
   */
  private async hydrateStoredMessageQueue(
    user: IUserToken,
    storedMessageQueue: SnapshotMessageQueueProps,
    logContext: Record<string, unknown>,
  ): Promise<IMessageQueue> {
    try {
      // Construct the complete domain object
      return Promise.resolve({
        id: storedMessageQueue.id,
        payload: storedMessageQueue.payload,
        status: storedMessageQueue.status,
        priority: storedMessageQueue.priority,
        scheduledAt: storedMessageQueue.scheduledAt,
        sentAt: storedMessageQueue.sentAt,
        failureReason: storedMessageQueue.failureReason,
        correlationId: storedMessageQueue.correlationId,
        retryCount: storedMessageQueue.retryCount,
      });
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          messageCode: storedMessageQueue.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to hydrate message entity: ${storedMessageQueue.id}`,
      );
      throw error;
    }
  }
}
