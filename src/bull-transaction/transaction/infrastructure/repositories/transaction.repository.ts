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
  BullTransactionLoggingHelper,
  BullTransactionServiceConstants,
} from '../../../shared/domain/value-objects';
import { Transaction } from '../../domain/aggregates';
import { ITransaction } from '../../domain/entities';
import { TransactionCreatedEvent } from '../../domain/events';
import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../../domain/exceptions';
import { SnapshotTransactionProps } from '../../domain/properties';
import { TransactionProjectionKeys } from '../../domain/value-objects/transaction-projection-keys';
import { TransactionMemoryProjection } from '../projectors';

const COMPONENT_NAME = 'TransactionRepository';

export class TransactionRepository extends SagaCommandRepository<
  ITransaction,
  Transaction,
  typeof TransactionExceptionMessage
> {
  private static readonly SERVICE_NAME =
    BullTransactionServiceConstants.SERVICE_NAME;

  constructor(
    protected readonly configService: ConfigService,
    @Inject('ILogger') protected readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly snapshotService: SnapshotService,

    @Inject('TransactionMemoryProjection')
    private readonly transactionProjection: TransactionMemoryProjection,
  ) {
    super(configService, logger, TransactionExceptionMessage, Transaction);
  }

  /**
   * Generates entity-level stream name following: <context>.<aggregate>.<version>-<tenant>-<entityId>
   * Each transaction gets its own stream for optimal performance
   * Example: banking.transaction.v1-tenant123-USD
   */
  private buildStreamName(tenant: string, transactionCode: string): string {
    return TransactionProjectionKeys.getEventStoreStreamName(
      tenant,
      transactionCode,
    );
  }

  protected getCreateEvent(user: IUserToken, aggregate: Transaction): IEvent {
    return new TransactionCreatedEvent(
      user,
      aggregate.getId(),
      aggregate.toDto(),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getUpdateEvent(user: IUserToken, aggregate: Transaction): IEvent {
    throw new TransactionDomainException(
      TransactionExceptionMessage.notImplemented,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getDeleteEvent(user: IUserToken, aggregate: Transaction): IEvent {
    throw new TransactionDomainException(
      TransactionExceptionMessage.notImplemented,
    );
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement the get method from SagaCommandRepository
  protected async get(
    user: IUserToken,
    identifier: string | number,
  ): Promise<ITransaction | undefined> {
    const id = identifier.toString();
    const tenant = user.tenant;
    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'get',
      id,
      user,
    );

    this.logger.debug(logContext, `Getting transaction by id: ${id}`);

    try {
      // Get transaction from EventStore using entity-level stream (one stream per transaction)
      const streamName = this.buildStreamName(tenant || '', id);

      // Try to get the latest snapshot first using the specialized service
      const snapshot =
        await this.snapshotService.getLatestSnapshot<SnapshotTransactionProps>(
          streamName,
        );

      if (!snapshot) {
        return undefined; // Not found
      }

      // Use the helper method for hydration
      const transaction = this.hydrateStoredTransaction(
        user,
        snapshot,
        logContext,
      );

      this.logger.debug(
        logContext,
        `Successfully retrieved transaction: ${id}`,
      );
      return transaction;
    } catch (e) {
      this.logger.error(
        {
          ...logContext,
          id,
          tenant,
          username: user?.preferred_username,
          error: e instanceof Error ? e.message : 'Unknown error',
        },
        'Transaction get error',
      );

      return undefined; // Not found on error
    }
  }

  async getTransaction(user: IUserToken, id: string): Promise<ITransaction> {
    const result = await this.get(user, id);
    if (!result) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.notFound,
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
    entity: ITransaction,
  ): Transaction {
    return Transaction.fromEntity(entity);
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement save method from SagaCommandRepository
  protected async save(
    user: IUserToken,
    data: Transaction,
    sagaContext?: ISagaContext,
  ): Promise<ITransaction> {
    if (!user) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.userRequiredForOperation,
      );
    }
    if (!data || !data.id) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldCodeRequired,
      );
    }

    const tenant = user.tenant;
    const transactionCode = data.getId(); // Convert TransactionIdentifier to string
    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'save',
      transactionCode,
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

    this.logger.debug(logContext, `Saving transaction: ${transactionCode}`);

    try {
      // ✅ EVENT SOURCING: Use proper tenant-specific stream naming with new DDD convention
      const streamName = this.buildStreamName(tenant || '', transactionCode);

      // ✅ SAGA-FRIENDLY: Check for idempotency using saga context
      if (sagaContext) {
        const existingEvent = await this.checkSagaOperationExists(
          streamName,
          transactionCode,
          sagaContext.operationId,
        );

        if (existingEvent) {
          this.logger.debug(
            logContext,
            `Saga operation already completed for transaction: ${transactionCode}`,
          );
          // Return existing result instead of duplicate operation
          const existing = await this.get(user, transactionCode);
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
          `No uncommitted events for transaction: ${transactionCode}, returning current state`,
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
        context: TransactionProjectionKeys.ESDB_BOUNDED_CONTEXT,
        aggregateType: TransactionProjectionKeys.ESDB_AGGREGATE_NAME,
        version: TransactionProjectionKeys.ESDB_VERSION,
        service: TransactionRepository.SERVICE_NAME,
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
        `Successfully saved transaction: ${transactionCode} with ${uncommittedEvents.length} events`,
      );

      // ✅ SAGA-FRIENDLY: Return aggregate data directly instead of querying
      // This avoids read-after-write consistency issues in sagas
      return data.toDto();
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          tenant,
          transactionCode,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to save transaction',
      );

      if (error instanceof TransactionDomainException) {
        throw error;
      }

      throw new TransactionDomainException(
        TransactionExceptionMessage.updateError,
      );
    }
  }

  // Helper method to rebuild transaction from events
  private rebuildTransactionFromEvents(
    events: DomainEvent[],
    snapshot?: SnapshotTransactionProps,
  ): SnapshotTransactionProps {
    if (snapshot) {
      return snapshot;
    } else {
      // Type-safe event processing - look for TransactionCreatedEvent
      throw new Error('No transaction creation event found in stream');
    }
  }

  // ✅ REQUIRED ABSTRACT METHOD: Implement compensate method from SagaCommandRepository
  protected async compensate(
    user: IUserToken,
    identifier: string | number,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const transactionCode = identifier.toString();
    await this.compensateSave(user, transactionCode, sagaContext);
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
    transactionCode: string,
    sagaContext: ISagaContext,
  ): Promise<void> {
    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'compensateSave',
      transactionCode,
      user,
    );

    Object.assign(logContext, {
      sagaId: sagaContext.sagaId,
      correlationId: sagaContext.correlationId,
      operationId: sagaContext.operationId,
    });

    this.logger.debug(
      logContext,
      `Compensating save operation for transaction: ${transactionCode}`,
    );

    try {
      const streamName = this.buildStreamName(
        user.tenant || '',
        transactionCode,
      );

      // Create compensation event
      const compensationEvent = {
        id: transactionCode,
        eventType: 'TransactionUpdateCompensated',
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
        `Successfully compensated save operation for transaction: ${transactionCode}`,
      );
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          transactionCode,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to compensate save operation',
      );
      throw error;
    }
  }

  async saveTransaction(
    user: IUserToken,
    data: Transaction,
    sagaContext?: ISagaContext,
  ): Promise<ITransaction> {
    return await this.save(user, data, sagaContext);
  }

  /**
   * Hydrates a Transaction to a complete ITransaction domain object.
   * This abstraction supports multiple data sources: EventStore snapshots,
   * rebuilt events, SQL projections, or Redis fallback during migration.
   * @private
   */
  private async hydrateStoredTransaction(
    user: IUserToken,
    storedTransaction: SnapshotTransactionProps,
    logContext: Record<string, unknown>,
  ): Promise<ITransaction> {
    try {
      // Construct the complete domain object
      return Promise.resolve({
        id: storedTransaction.id,
        from: storedTransaction.from,
        to: storedTransaction.to,
        amount: storedTransaction.amount,
        status: storedTransaction.status,
        scheduledAt: storedTransaction.scheduledAt,
        processedAt: storedTransaction.processedAt,
        failureReason: storedTransaction.failureReason,
        correlationId: storedTransaction.correlationId,
        retryCount: storedTransaction.retryCount,
        priority: storedTransaction.priority,
      });
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          transactionCode: storedTransaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to hydrate transaction entity: ${storedTransaction.id}`,
      );
      throw error;
    }
  }
}
