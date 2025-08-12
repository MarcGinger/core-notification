import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { BullTransactionLoggingHelper } from '../../../shared/domain/value-objects';
import { ProcessTransactionCreateCommand } from '../../application/commands';
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
    timestamp: string;
    correlationId?: string;
    causationId?: string;
  };
  user: IUserToken;
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
    const { transactionId, metadata, user } = eventData;

    if (!metadata) {
      throw new Error('Missing metadata for transaction created event');
    }

    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      'TransactionEventProcessor',
      'processTransactionCreated',
      transactionId,
      user,
      {
        operation: 'PROCESS_EVENT',
        entityType: 'transaction',
        phase: 'START',
        eventData,
        // eventType: eventData.eventType,
        // eventVersion: eventData.eventVersion,
        timestamp: metadata.timestamp,
      },
    );

    this.logger.log(
      logContext,
      `Processing transaction created event: transactionId '${transactionId}'`,
    );

    try {
      // Simple auto-processing: immediately mark the transaction as completed
      // This implements the "no real business logic" requirement
      const processCommand = new ProcessTransactionCreateCommand(user, {
        id: transactionId,
        from:
          ((eventData.eventData as Record<string, any>)?.from as string) ||
          'unknown',
        to:
          ((eventData.eventData as Record<string, any>)?.to as string) ||
          'unknown',
        amount:
          Number((eventData.eventData as Record<string, any>)?.amount) || 0,
      });

      await this.commandBus.execute(processCommand);

      this.logger.log(
        {
          ...logContext,
          phase: 'SUCCESS',
        },
        `Successfully auto-processed transaction: transactionId '${transactionId}' marked as completed`,
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
}
