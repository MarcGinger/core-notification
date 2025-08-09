/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import {
  JOB_OPTIONS_TEMPLATES,
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import {
  IMessageRoutingStrategy,
  StandardJobOptions,
  TransactionNotificationJobData,
  UpdateMessageQueueProps,
} from 'src/shared/message-queue';

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
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    // Handle all transaction-related events
    return Boolean(
      meta.eventType?.includes('transaction.') ||
        meta.stream?.includes('transaction') ||
        eventData.payload?.transactionId ||
        eventData.payload?.from || // transaction has from/to fields
        (eventData.payload?.amount && eventData.payload?.to),
    );
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
}
