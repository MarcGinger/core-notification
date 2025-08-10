/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import {
  JOB_OPTIONS_TEMPLATES,
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import {
  IMessageRoutingStrategy,
  StandardJobOptions,
  TransactionNotificationJobData,
  UpdateMessageQueueProps,
} from 'src/shared/message-queue';
import { TransactionEventData, TransactionEventProcessor } from '../processors';

/**
 * Transaction-specific message routing strategy
 * Handles routing and transformation of transaction events to notification queues
 */
@Injectable()
export class TransactionMessageRoutingStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      TransactionNotificationJobData
    >
{
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly transactionEventProcessor: TransactionEventProcessor,
  ) {
    this.logger.log(
      {
        component: 'TransactionMessageRoutingStrategy',
      },
      'Transaction message routing strategy initialized',
    );
  }

  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    this.logger.log(
      {
        component: 'TransactionMessageRoutingStrategy',
        operation: 'canHandle',
        eventType: meta.eventType,
        stream: meta.stream,
        eventId: eventData.id,
      },
      `Checking if can handle event: ${meta.eventType} from stream: ${meta.stream}`,
    );

    // Handle all transaction-related events
    const canHandle = Boolean(
      meta.eventType?.includes('transaction.') ||
        meta.stream?.includes('transaction') ||
        eventData.payload?.transactionId ||
        eventData.payload?.from || // transaction has from/to fields
        (eventData.payload?.amount && eventData.payload?.to),
    );

    this.logger.log(
      {
        component: 'TransactionMessageRoutingStrategy',
        operation: 'canHandle',
        eventType: meta.eventType,
        canHandle,
        reasons: {
          eventTypeIncludes: meta.eventType?.includes('transaction.'),
          streamIncludes: meta.stream?.includes('transaction'),
          hasTransactionId: !!eventData.payload?.transactionId,
          hasFromField: !!eventData.payload?.from,
          hasAmountAndTo: !!(
            eventData.payload?.amount && eventData.payload?.to
          ),
        },
      },
      `Can handle result: ${canHandle} for event: ${meta.eventType}`,
    );

    // If this is a transaction event, process it asynchronously (fire and forget)
    if (canHandle && meta.eventType?.includes('transaction.')) {
      this.logger.log(
        {
          component: 'TransactionMessageRoutingStrategy',
          operation: 'canHandle',
          eventType: meta.eventType,
        },
        `Triggering async event processing for: ${meta.eventType}`,
      );

      this.processTransactionEventAsync(eventData, meta).catch((error) => {
        this.logger.error(
          {
            component: 'TransactionMessageRoutingStrategy',
            operation: 'processTransactionEventAsync',
            eventType: meta.eventType,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to process transaction event',
        );
      });
    }

    return canHandle;
  }

  getQueueName(): string {
    return QUEUE_NAMES.NOTIFICATION; // Use notification queue for transaction events
  }

  getJobType(): string {
    return 'send-transaction-notification';
  }

  getJobOptions(_eventData: UpdateMessageQueueProps): StandardJobOptions {
    // Transaction notifications are high priority
    return {
      ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
      priority: QUEUE_PRIORITIES.HIGH,
      delay: 0,
      attempts: 3, // Retry failed notifications
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): TransactionNotificationJobData {
    // Extract action from event type using transaction domain logic
    const action = this.extractActionFromEventType(
      eventData.payload?.eventType as string,
    ) as 'created' | 'completed' | 'failed' | 'queued' | 'retrying';

    return {
      transactionId: eventData.id,
      action,
      transaction: {
        from: (eventData.payload?.from as string) || 'unknown',
        to: (eventData.payload?.to as string) || 'unknown',
        amount: (eventData.payload?.amount as number) || 0,
        status: (eventData.payload?.status as string) || 'unknown',
      },
      tenant: user.tenant || 'unknown',
      userId: user.sub,
      correlationId: eventData.correlationId,
      timestamp: new Date(),
      metadata: {
        ...eventData.payload,
        originalEventType: eventData.payload?.eventType as string,
        streamName: eventData.payload?.streamName as string,
      },
    };
  }

  /**
   * Extract action from transaction event type
   * This is transaction domain-specific logic
   */
  private extractActionFromEventType(eventType: string): string {
    if (!eventType) return 'unknown';

    // Extract action from event types like 'transaction.created.v1', 'transaction.completed.v1'
    const parts = eventType.split('.');
    if (parts.length >= 2 && parts[0] === 'transaction') {
      const action = parts[1]; // 'created', 'completed', 'failed', etc.

      // Validate against known transaction actions
      const validActions = [
        'created',
        'completed',
        'failed',
        'queued',
        'retrying',
      ];
      return validActions.includes(action) ? action : 'unknown';
    }

    return 'unknown';
  }

  /**
   * Process transaction events through the event processor
   */
  private async processTransactionEventAsync(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    this.logger.log(
      {
        component: 'TransactionMessageRoutingStrategy',
        operation: 'processTransactionEventAsync',
        eventType: meta.eventType,
        eventId: eventData.id,
      },
      `Starting async processing for transaction event: ${meta.eventType}`,
    );

    try {
      const transactionEventData: TransactionEventData = {
        transactionId: eventData.id,
        eventType: meta.eventType || 'unknown',
        eventVersion: 1, // You might want to extract this from meta
        eventData: eventData.payload,
        metadata: {
          tenant: (eventData.payload?.tenant as string) || 'unknown',
          requestedBy: (eventData.payload?.requestedBy as string) || 'system',
          timestamp: new Date().toISOString(),
          correlationId: eventData.correlationId,
        },
      };

      this.logger.log(
        {
          component: 'TransactionMessageRoutingStrategy',
          operation: 'processTransactionEventAsync',
          eventType: meta.eventType,
          transactionId: transactionEventData.transactionId,
          metadata: transactionEventData.metadata,
        },
        `Created transaction event data for processing: ${meta.eventType}`,
      );

      // Route to appropriate processor method based on event type
      const eventType = meta.eventType || '';
      if (eventType.includes('transaction.created')) {
        this.logger.log(
          {
            component: 'TransactionMessageRoutingStrategy',
            operation: 'processTransactionEventAsync',
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
            component: 'TransactionMessageRoutingStrategy',
            operation: 'processTransactionEventAsync',
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
            component: 'TransactionMessageRoutingStrategy',
            operation: 'processTransactionEventAsync',
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
            component: 'TransactionMessageRoutingStrategy',
            operation: 'processTransactionEventAsync',
            eventType,
            route: 'processTransactionQueued',
          },
          `Routing to processTransactionQueued for: ${eventType}`,
        );
        await this.transactionEventProcessor.processTransactionQueued(
          transactionEventData,
        );
      } else {
        this.logger.warn(
          {
            component: 'TransactionMessageRoutingStrategy',
            operation: 'processTransactionEventAsync',
            eventType,
          },
          `No specific processor route found for event type: ${eventType}`,
        );
      }

      this.logger.log(
        {
          component: 'TransactionMessageRoutingStrategy',
          operation: 'processTransactionEventAsync',
          eventType: meta.eventType,
          status: 'success',
        },
        `Successfully completed async processing for: ${meta.eventType}`,
      );
    } catch (error) {
      this.logger.error(
        {
          component: 'TransactionMessageRoutingStrategy',
          operation: 'processTransactionEventAsync',
          eventType: meta.eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        `Error processing transaction event: ${meta.eventType}`,
      );
      // Don't rethrow - we don't want to break the message routing
    }
  }
}
