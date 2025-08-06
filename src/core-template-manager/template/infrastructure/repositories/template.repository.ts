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
import {
  CoreTemplateManagerLoggingHelper,
  CoreTemplateManagerServiceConstants,
} from '../../../shared/domain/value-objects';
import { Template } from '../../domain/aggregates';
import { ITemplate } from '../../domain/entities';
import {
  TemplateCreatedEvent,
  TemplateUpdatedEvent,
} from '../../domain/events';
import {
  TemplateDomainException,
  TemplateExceptionMessage,
} from '../../domain/exceptions';
import {
  ListTemplatePropsOptions,
  SnapshotTemplateProps,
  TemplatePage,
} from '../../domain/properties';
import { TemplateProjectionKeys } from '../../domain/value-objects/template-projection-keys';
import { TemplateRedisProjection } from '../projectors';

const COMPONENT_NAME = 'TemplateRepository';

export class TemplateRepository extends SagaCommandRepository<
  ITemplate,
  Template,
  typeof TemplateExceptionMessage
> {
  private static readonly SERVICE_NAME =
    CoreTemplateManagerServiceConstants.SERVICE_NAME;

  constructor(
    protected readonly configService: ConfigService,
    @Inject('ILogger') protected readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly snapshotService: SnapshotService,

    @Inject('TemplateRedisProjection')
    private readonly readProjection: TemplateRedisProjection,
  ) {
    super(configService, logger, TemplateExceptionMessage, Template);
  }

  /**
   * Generates entity-level stream name following: <context>.<aggregate>.<version>-<tenant>-<entityId>
   * Each template gets its own stream for optimal performance
   * Example: banking.template.v1-tenant123-USD
   */
  private buildStreamName(tenant: string, templateCode: string): string {
    return TemplateProjectionKeys.getEventStoreStreamName(tenant, templateCode);
  }

  protected getCreateEvent(user: IUserToken, aggregate: Template): IEvent {
    return new TemplateCreatedEvent(user, aggregate.getId(), aggregate.toDto());
  }

  protected getUpdateEvent(user: IUserToken, aggregate: Template): IEvent {
    return new TemplateUpdatedEvent(user, aggregate.getId(), aggregate.toDto());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getDeleteEvent(user: IUserToken, aggregate: Template): IEvent {
    throw new TemplateDomainException(TemplateExceptionMessage.notImplemented);
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement the get method from SagaCommandRepository
  protected async get(
    user: IUserToken,
    identifier: string | number,
  ): Promise<ITemplate | undefined> {
    const code = identifier.toString();
    const tenant = user.tenant;
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        COMPONENT_NAME,
        'get',
        code,
        user,
      );

    this.logger.debug(logContext, `Getting template by code: ${code}`);

    try {
      // Get template from EventStore using entity-level stream (one stream per template)
      const streamName = this.buildStreamName(tenant || '', code);

      // Try to get the latest snapshot first using the specialized service
      const snapshot =
        await this.snapshotService.getLatestSnapshot<SnapshotTemplateProps>(
          streamName,
        );

      if (!snapshot) {
        // Template not found - this is a legitimate "not found" case
        this.logger.debug(logContext, `Template not found: ${code}`);
        return undefined;
      }

      // Use the helper method for hydration
      const template = this.hydrateStoredTemplate(user, snapshot, logContext);

      this.logger.debug(logContext, `Successfully retrieved template: ${code}`);
      return template;
    } catch (e) {
      // Distinguish between technical errors and legitimate "not found"
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';

      this.logger.error(
        {
          ...logContext,
          code,
          tenant,
          username: user?.preferred_username,
          error: errorMessage,
        },
        `Template retrieval error for ${code}: ${errorMessage}`,
      );

      // For technical errors during snapshot retrieval, we should throw
      // rather than silently returning undefined
      if (e instanceof TemplateDomainException) {
        throw e;
      }

      // For other technical errors, still return undefined but log appropriately
      return undefined;
    }
  }

  async getTemplate(user: IUserToken, code: string): Promise<ITemplate> {
    const result = await this.get(user, code);
    if (!result) {
      throw new TemplateDomainException(TemplateExceptionMessage.notFound);
    }
    return result;
  }

  /**
   * ✅ CLEAN: Repository delegates aggregate creation to domain factory
   * No knowledge of internal domain structure required
   */
  protected createAggregate(user: IUserToken, entity: ITemplate): Template {
    return Template.fromEntity(entity);
  }

  async list(
    user: IUserToken,
    pageOptions: ListTemplatePropsOptions = {},
  ): Promise<TemplatePage> {
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        COMPONENT_NAME,
        'list',
        `page:${pageOptions.page || 1}`,
        user,
      );

    this.logger.debug(
      logContext,
      `Listing templates with options: ${JSON.stringify(pageOptions)}`,
    );

    try {
      // Check if we have the projection available and initialized
      if (this.readProjection.isReady()) {
        return this.listFromProjection(user, pageOptions, logContext);
      } else {
        // Log error and throw - projection should be available
        this.logger.error(
          logContext,
          'Template projection is not available or not ready. Cannot list templates without projection.',
        );
        throw new TemplateDomainException(
          TemplateExceptionMessage.projectionNotAvailable ||
            TemplateExceptionMessage.notFound,
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
        'Failed to list Templates',
      );

      if (error instanceof TemplateDomainException) {
        throw error;
      }

      throw new TemplateDomainException(TemplateExceptionMessage.notFound);
    }
  }

  /**
   * List templates using the in-memory projection for optimal performance
   */
  private async listFromProjection(
    user: IUserToken,
    pageOptions: ListTemplatePropsOptions,
    logContext: Record<string, unknown>,
  ): Promise<TemplatePage> {
    this.logger.debug(logContext, 'Using template projection for listing');

    // Build filter from page options with proper typing
    const filter: {
      code?: string;
      name?: string;
    } = {};

    if (pageOptions.code) {
      filter.code = pageOptions.code;
    }
    if (pageOptions.name) {
      filter.name = pageOptions.name;
    }

    // Get templates from projection with proper null check
    const projectionTemplates = await this.readProjection.getTemplatesForTenant(
      user.tenant || '',
      filter,
    );

    // Apply sorting
    const sortedTemplates = [...projectionTemplates];
    if (pageOptions.orderBy) {
      sortedTemplates.sort((a, b) => {
        const field = pageOptions.orderBy! as keyof SnapshotTemplateProps;
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

    const paginatedTemplates = sortedTemplates.slice(skip, skip + size);

    // Convert to ListTemplateProps format
    const items = await Promise.all(
      paginatedTemplates.map(
        async (template) =>
          await this.hydrateStoredTemplate(user, template, logContext),
      ),
    );

    // Create proper IListMeta
    const meta = {
      page,
      size,
      itemCount: sortedTemplates.length,
      pageCount: Math.ceil(sortedTemplates.length / size),
      hasPreviousPage: page > 1,
      hasNextPage: page < Math.ceil(sortedTemplates.length / size),
    };

    const templatePage = new TemplatePage(items, meta);

    this.logger.debug(
      logContext,
      `Successfully listed ${items.length}/${sortedTemplates.length} templates from projection (page ${page}/${meta.pageCount})`,
    );

    return templatePage;
  }

  async getByCodes(user: IUserToken, codes: string[]): Promise<ITemplate[]> {
    if (!codes || codes.length === 0) {
      return [];
    }

    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        COMPONENT_NAME,
        'getByCodes',
        codes.join(','),
        user,
      );

    this.logger.debug(
      logContext,
      `Getting templates by codes: ${codes.join(', ')}`,
    );

    try {
      // Use Promise.all to parallelize individual get calls for optimal performance
      const templatePromises = codes.map(async (code) => {
        try {
          return await this.get(user, code);
        } catch (error) {
          // Log warning but return undefined for failed retrievals
          this.logger.warn(
            logContext,
            `Failed to get template ${code}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          return undefined;
        }
      });

      const templateResults = await Promise.all(templatePromises);

      // Filter out undefined results (failed retrievals)
      const templates = templateResults.filter(
        (template): template is ITemplate => template !== undefined,
      );

      this.logger.debug(
        logContext,
        `Successfully retrieved ${templates.length}/${codes.length} templates using Promise.all`,
      );

      return templates;
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          codes,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get Templates by codes',
      );

      if (error instanceof TemplateDomainException) {
        throw error;
      }

      throw new TemplateDomainException(TemplateExceptionMessage.notFound);
    }
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement save method from SagaCommandRepository
  protected async save(
    user: IUserToken,
    data: Template,
    sagaContext?: ISagaContext,
  ): Promise<ITemplate> {
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForOperation,
      );
    }
    if (!data || !data.code) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldCodeRequired,
      );
    }

    const tenant = user.tenant;
    const templateCode = data.getId(); // Convert TemplateIdentifier to string
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        COMPONENT_NAME,
        'save',
        templateCode,
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

    this.logger.debug(logContext, `Saving template: ${templateCode}`);

    try {
      // ✅ EVENT SOURCING: Use proper tenant-specific stream naming with new DDD convention
      const streamName = this.buildStreamName(tenant || '', templateCode);

      // ✅ SAGA-FRIENDLY: Check for idempotency using saga context
      if (sagaContext) {
        const existingEvent = await this.checkSagaOperationExists(
          streamName,
          templateCode,
          sagaContext.operationId,
        );

        if (existingEvent) {
          this.logger.debug(
            logContext,
            `Saga operation already completed for template: ${templateCode}`,
          );
          // Return existing result instead of duplicate operation
          const existing = await this.get(user, templateCode);
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
          `No uncommitted events for template: ${templateCode}, returning current state`,
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
        context: TemplateProjectionKeys.ESDB_BOUNDED_CONTEXT,
        aggregateType: TemplateProjectionKeys.ESDB_AGGREGATE_NAME,
        version: TemplateProjectionKeys.ESDB_VERSION,
        service: TemplateRepository.SERVICE_NAME,
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
        `Successfully saved template: ${templateCode} with ${uncommittedEvents.length} events`,
      );

      // ✅ SAGA-FRIENDLY: Return aggregate data directly instead of querying
      // This avoids read-after-write consistency issues in sagas
      return data.toDto();
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          tenant,
          templateCode,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to save template',
      );

      if (error instanceof TemplateDomainException) {
        throw error;
      }

      throw new TemplateDomainException(TemplateExceptionMessage.updateError);
    }
  }

  // Helper method to rebuild template from events
  private rebuildTemplateFromEvents(
    events: DomainEvent[],
    snapshot?: SnapshotTemplateProps,
  ): SnapshotTemplateProps {
    if (snapshot) {
      return snapshot;
    } else {
      // Type-safe event processing - look for TemplateCreatedEvent
      throw new Error('No template creation event found in stream');
    }
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement compensate method from SagaCommandRepository
  protected async compensate(
    user: IUserToken,
    identifier: string | number,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const templateCode = identifier.toString();
    await this.compensateSave(user, templateCode, sagaContext);
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
    templateCode: string,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        COMPONENT_NAME,
        'compensateSave',
        templateCode,
        user,
      );

    Object.assign(logContext, {
      sagaId: sagaContext.sagaId,
      correlationId: sagaContext.correlationId,
      operationId: sagaContext.operationId,
    });

    this.logger.debug(
      logContext,
      `Compensating save operation for template: ${templateCode}`,
    );

    try {
      // TODO: Implement compensation logic with EventOrchestrationService
      // For now, log the compensation attempt
      this.logger.warn(
        logContext,
        `Compensation not yet implemented for template: ${templateCode}`,
      );

      // Placeholder for future implementation
      await Promise.resolve();

      this.logger.debug(
        logContext,
        `Compensation logged for template: ${templateCode}`,
      );
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          templateCode,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to compensate save operation',
      );
      throw error;
    }
  }

  async saveTemplate(
    user: IUserToken,
    data: Template,
    sagaContext?: ISagaContext,
  ): Promise<ITemplate> {
    return await this.save(user, data, sagaContext);
  }

  /**
   * Hydrates a Template to a complete ITemplate domain object.
   * This abstraction supports multiple data sources: EventStore snapshots,
   * rebuilt events, or Redis projections for backward compatibility.
   * @private
   */
  private async hydrateStoredTemplate(
    user: IUserToken,
    storedTemplate: SnapshotTemplateProps,
    logContext: Record<string, unknown>,
  ): Promise<ITemplate> {
    try {
      // Construct the complete domain object
      return Promise.resolve({
        code: storedTemplate.code,
        name: storedTemplate.name,
        description: storedTemplate.description,
        transport: storedTemplate.transport,
        useCase: storedTemplate.useCase,
        version: storedTemplate.version,
        content: storedTemplate.content,
        contentUrl: storedTemplate.contentUrl,
        payloadSchema: storedTemplate.payloadSchema,
        active: storedTemplate.active,
      });
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          templateCode: storedTemplate.code,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to hydrate template entity: ${storedTemplate.code}`,
      );
      throw error;
    }
  }
}
