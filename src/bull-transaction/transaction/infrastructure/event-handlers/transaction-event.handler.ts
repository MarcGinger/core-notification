/**
 * TRANSACTION DOMAIN EVENT HANDLER
 * Processes transaction events and routes them to appropriate message queues
 * Handles both business logic execution and message queue routing in one place
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from 'src/shared/infrastructure/bullmq';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { UpdateMessageQueueProps } from 'src/shared/message-queue/domain/properties';
import {
  TransactionEventData,
  TransactionEventProcessor,
} from '../processors/transaction-event.processor';

/**
 * Transaction-specific event handler
 * Executes business logic for transaction events AND routes them to notification queues
 * Owns the complete transaction event processing pipeline
 */
@Injectable()
export class TransactionEventHandler {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly transactionEventProcessor: TransactionEventProcessor,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.log(
      {
        component: 'TransactionEventHandler',
      },
      'Transaction event handler initialized with queue routing',
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
          timestamp: new Date().toISOString(),
          correlationId: eventData.correlationId,
          ...eventData.payload,
        },
        user: {
          name: meta.username,
          sub: meta.userId,
          email: meta.username,
          tenant: meta.tenant,
          tenant_id: meta.tenantId,
          // Add other user properties as needed
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

      // After business logic processing, route to notification queue
      await this.routeToNotificationQueue(eventData, meta);

      this.logger.log(
        {
          component: 'TransactionEventHandler',
          operation: 'handleTransactionEvent',
          eventType,
          transactionId: eventData.id,
        },
        `Successfully processed transaction event and routed to notification queue: ${eventType}`,
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

  /**
   * Routes transaction events to notification queue for further processing
   */
  private async routeToNotificationQueue(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      const jobData = {
        eventData,
        meta,
        routedBy: 'TransactionEventHandler',
        routedAt: new Date().toISOString(),
      };

      await this.notificationQueue.add(
        'process-transaction-notification',
        jobData,
        {
          priority: this.getJobPriority(
            (eventData.payload?.eventType as string) || '',
          ),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(
        {
          component: 'TransactionEventHandler',
          operation: 'routeToNotificationQueue',
          eventType: eventData.payload?.eventType,
          transactionId: eventData.id,
          jobType: 'process-transaction-notification',
        },
        `Successfully routed transaction event to notification queue`,
      );
    } catch (error) {
      this.logger.error(
        {
          component: 'TransactionEventHandler',
          operation: 'routeToNotificationQueue',
          eventType: eventData.payload?.eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to route to notification queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Determines job priority based on event type
   */
  private getJobPriority(eventType: string): number {
    if (eventType.includes('transaction.failed')) {
      return 1; // High priority for failures
    } else if (eventType.includes('transaction.completed')) {
      return 2; // Medium-high priority for completions
    } else if (eventType.includes('transaction.created')) {
      return 3; // Medium priority for creation
    } else {
      return 5; // Lower priority for other events
    }
  }
}
