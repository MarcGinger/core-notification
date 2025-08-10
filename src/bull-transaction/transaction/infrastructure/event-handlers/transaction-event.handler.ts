/**
 * TRANSACTION DOMAIN EVENT HANDLER
 * Processes transaction events and executes business logic through TransactionEventProcessor
 * This handler runs BEFORE the generic message queue routing to execute domain-specific logic
 */

import { Inject, Injectable } from '@nestjs/common';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { UpdateMessageQueueProps } from 'src/shared/message-queue/domain/properties';
import {
  TransactionEventData,
  TransactionEventProcessor,
} from '../processors/transaction-event.processor';

/**
 * Transaction-specific event handler
 * Executes business logic for transaction events before they're routed to notification queues
 */
@Injectable()
export class TransactionEventHandler {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly transactionEventProcessor: TransactionEventProcessor,
  ) {
    this.logger.log(
      {
        component: 'TransactionEventHandler',
      },
      'Transaction event handler initialized',
    );
  }

  /**
   * Handle transaction events and execute business logic
   */
  async handleTransactionEvent(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Check if this is a transaction event we should process
      if (!this.isTransactionEvent(eventData, meta)) {
        return; // Not a transaction event, skip
      }

      const eventType = eventData.payload?.eventType as string;
      this.logger.log(
        {
          component: 'TransactionEventHandler',
          operation: 'handleTransactionEvent',
          eventType,
          transactionId: eventData.id,
          stream: meta.stream,
        },
        `Processing transaction event: ${eventType}`,
      );

      // Create transaction event data for the processor
      const transactionEventData: TransactionEventData = {
        transactionId: eventData.id,
        eventType: eventType,
        eventVersion: 1,
        eventData: eventData.payload,
        metadata: {
          tenant: 'system', // Default tenant for now
          requestedBy: 'event-handler',
          timestamp: new Date().toISOString(),
          correlationId: eventData.correlationId,
          ...eventData.payload,
        },
      };

      // Route to appropriate processor method based on event type
      if (eventType.includes('transaction.created')) {
        this.logger.log(
          {
            component: 'TransactionEventHandler',
            operation: 'handleTransactionEvent',
            eventType,
            route: 'processTransactionCreated',
          },
          `Routing to processTransactionCreated for: ${eventType}`,
        );
        await this.transactionEventProcessor.processTransactionCreated(
          transactionEventData,
        );
      } else if (eventType.includes('transaction.completed')) {
        this.logger.log(
          {
            component: 'TransactionEventHandler',
            operation: 'handleTransactionEvent',
            eventType,
            route: 'processTransactionCompleted',
          },
          `Routing to processTransactionCompleted for: ${eventType}`,
        );
        await this.transactionEventProcessor.processTransactionCompleted(
          transactionEventData,
        );
      } else if (eventType.includes('transaction.failed')) {
        this.logger.log(
          {
            component: 'TransactionEventHandler',
            operation: 'handleTransactionEvent',
            eventType,
            route: 'processTransactionFailed',
          },
          `Routing to processTransactionFailed for: ${eventType}`,
        );
        await this.transactionEventProcessor.processTransactionFailed(
          transactionEventData,
        );
      } else if (eventType.includes('transaction.queued')) {
        this.logger.log(
          {
            component: 'TransactionEventHandler',
            operation: 'handleTransactionEvent',
            eventType,
            route: 'processTransactionQueued',
          },
          `Routing to processTransactionQueued for: ${eventType}`,
        );
        await this.transactionEventProcessor.processTransactionQueued(
          transactionEventData,
        );
      } else {
        this.logger.debug(
          {
            component: 'TransactionEventHandler',
            operation: 'handleTransactionEvent',
            eventType,
          },
          `No specific processor method for event type: ${eventType}`,
        );
      }

      this.logger.log(
        {
          component: 'TransactionEventHandler',
          operation: 'handleTransactionEvent',
          eventType,
          transactionId: eventData.id,
        },
        `Successfully processed transaction event: ${eventType}`,
      );
    } catch (error) {
      this.logger.error(
        {
          component: 'TransactionEventHandler',
          operation: 'handleTransactionEvent',
          eventType: eventData.payload?.eventType,
          transactionId: eventData.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        `Failed to process transaction event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't re-throw to avoid breaking the notification flow
      // Business logic errors should be handled gracefully
    }
  }

  /**
   * Check if this is a transaction event we should process
   */
  private isTransactionEvent(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    const eventType = eventData.payload?.eventType as string;
    return Boolean(
      meta.stream?.includes('transaction') ||
        meta.eventType?.includes('transaction') ||
        eventType?.includes('transaction.'),
    );
  }
}
