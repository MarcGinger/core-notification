import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { BullTransactionLoggingHelper } from '../../../shared/domain/value-objects';
import { TransactionRepository } from '../repositories';

/**
 * Event data interface for Transaction event processing
 */
export interface TransactionEventData {
  transactionId: string;
  eventType: string;
  eventVersion: number;
  eventData: any;
  metadata?: {
    tenant: string;
    requestedBy: string;
    timestamp: string;
    correlationId?: string;
    causationId?: string;
  };
}

/**
 * Event processor for handling Transaction domain events
 * This processor handles business logic when transaction events are received
 * from the message queue implementation (not directly from BullMQ)
 */
@Injectable()
export class TransactionEventProcessor {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
    private readonly transactionRepository: TransactionRepository,
  ) {
    this.logger.log(
      {
        component: 'TransactionEventProcessor',
        processor: 'transaction',
      },
      'Transaction event processor initialized',
    );
  }

  /**
   * Process transaction created event
   * Called by message queue implementation when transaction.created.v1 is received
   */
  async processTransactionCreated(
    eventData: TransactionEventData,
  ): Promise<void> {
    const { transactionId, metadata } = eventData;

    if (!metadata) {
      throw new Error('Missing metadata for transaction created event');
    }

    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      'TransactionEventProcessor',
      'processTransactionCreated',
      transactionId,
      { tenant: metadata.tenant, sub: metadata.requestedBy } as IUserToken,
      {
        operation: 'PROCESS_EVENT',
        entityType: 'transaction',
        phase: 'START',
        eventType: eventData.eventType,
        eventVersion: eventData.eventVersion,
        timestamp: metadata.timestamp,
      },
    );

    this.logger.log(
      logContext,
      `Processing transaction created event: transactionId '${transactionId}'`,
    );

    try {
      // Create user context from event metadata
      const user: IUserToken = {
        sub: metadata.requestedBy,
        tenant: metadata.tenant,
        // Add other required properties as needed
      } as IUserToken;

      // Load the transaction from EventStore
      const transaction = await this.transactionRepository.getById(
        user,
        transactionId,
      );

      if (!transaction) {
        throw new Error(`Transaction with ID ${transactionId} not found`);
      }

      // Update the transaction status to "queued" in EventStore
      // This happens when the event is processed and queued for processing
      transaction.markAsQueued(
        user,
        metadata.correlationId || 'event-driven',
        0, // Default priority
      );

      // Save the aggregate with the new events
      const sagaContext = {
        sagaId: `transaction-${transactionId}`,
        correlationId: metadata.correlationId || transactionId,
        operationId: `event-${eventData.eventType}-${Date.now()}`,
        isRetry: false,
      };

      await this.transactionRepository.updateAndReturnDtoWithSaga(
        user,
        transaction,
        sagaContext,
      );

      // TODO: Add your actual transaction processing logic here
      // This could include executing commands via CommandBus

      this.logger.log(
        {
          ...logContext,
          phase: 'SUCCESS',
        },
        `Successfully processed transaction created event: transactionId '${transactionId}'`,
      );
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          phase: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to process transaction created event: transactionId '${transactionId}'`,
      );
      throw error;
    }
  }

  /**
   * Process transaction completed event
   */
  processTransactionCompleted(eventData: TransactionEventData): Promise<void> {
    const { transactionId } = eventData;

    this.logger.log(
      {
        component: 'TransactionEventProcessor',
        operation: 'processTransactionCompleted',
        transactionId,
        eventType: eventData.eventType,
      },
      `Processing transaction completed event: ${transactionId}`,
    );

    // TODO: Implement business logic for transaction completion
    // This might include sending notifications, updating related entities, etc.
    return Promise.resolve();
  }

  /**
   * Process transaction failed event
   */
  processTransactionFailed(eventData: TransactionEventData): Promise<void> {
    const { transactionId } = eventData;

    this.logger.log(
      {
        component: 'TransactionEventProcessor',
        operation: 'processTransactionFailed',
        transactionId,
        eventType: eventData.eventType,
      },
      `Processing transaction failed event: ${transactionId}`,
    );

    // TODO: Implement business logic for transaction failure
    // This might include error handling, rollback operations, notifications, etc.
    return Promise.resolve();
  }

  /**
   * Process transaction queued event
   */
  processTransactionQueued(eventData: TransactionEventData): Promise<void> {
    const { transactionId } = eventData;

    this.logger.log(
      {
        component: 'TransactionEventProcessor',
        operation: 'processTransactionQueued',
        transactionId,
        eventType: eventData.eventType,
      },
      `Processing transaction queued event: ${transactionId}`,
    );

    // TODO: Implement business logic for transaction queued
    // This might include status updates, monitoring setup, etc.
    return Promise.resolve();
  }

  /**
   * Create user context from event metadata
   */
  private createUserContext(
    metadata?: TransactionEventData['metadata'],
  ): IUserToken {
    if (!metadata) {
      throw new Error('Missing metadata for user context');
    }

    return {
      sub: metadata.requestedBy,
      tenant: metadata.tenant,
      // Add other required properties based on your IUserToken interface
    } as IUserToken;
  }
}
