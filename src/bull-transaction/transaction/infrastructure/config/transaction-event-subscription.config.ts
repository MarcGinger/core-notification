/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { MessageQueueEventSubscriptionConfig } from 'src/shared/message-queue';
import { QueueRoute } from '../../../../shared/message-queue/types';

/**
 * Configuration factory for transaction event subscriptions
 *
 * @deprecated This configuration is part of the legacy central routing infrastructure.
 * Transaction domain now uses TransactionEventHandler for direct event processing.
 * This configuration will be removed in a future version.
 */
export const createTransactionEventSubscriptionConfig =
  (): MessageQueueEventSubscriptionConfig => {
    const routeMap: Record<string, QueueRoute> = {
      // Notification routes
      'notification.send': {
        queueName: 'notifications',
        options: { attempts: 3, priority: 5 },
      },

      // Transaction routes
      'transaction.settle': {
        queueName: 'transactions',
        options: { attempts: 5, priority: 10 },
      },
      'transaction.refund': {
        queueName: 'transactions',
        options: { attempts: 3, priority: 8 },
      },
      'transaction.validate': {
        queueName: 'transactions',
        options: { attempts: 2, priority: 7 },
      },
    };

    return {
      eventSubscriptions: [
        {
          streamPattern: '$et-message-queue.created.v1',
          purpose: 'MessageCreatedEvent subscription - all aggregates',
          description: 'message-queue.created.v1 events',
        },
        {
          streamPattern: '$et-transaction.created.v1',
          purpose:
            'TransactionCreatedEvent subscription - route to notifications',
          description: 'transaction.created.v1 events',
        },
        {
          streamPattern: '$et-transaction.completed.v1',
          purpose:
            'TransactionCompletedEvent subscription - route to notifications',
          description: 'transaction.completed.v1 events',
        },
        {
          streamPattern: '$et-transaction.failed.v1',
          purpose:
            'TransactionFailedEvent subscription - route to notifications',
          description: 'transaction.failed.v1 events',
        },
        {
          streamPattern: '$et-transaction.queued.v1',
          purpose:
            'TransactionQueuedEvent subscription - route to notifications',
          description: 'transaction.queued.v1 events',
        },
      ],
      customStrategies: [], // Deprecated: Use TransactionEventHandler instead

      // Domain configuration
      domain: 'transaction',
      messageQueueAdapter: 'TransactionMessageAdapter',
      routeMap,
    };
  };
