/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Subscription } from 'rxjs';
import {
  EventOrchestrationService,
  EventStoreMetaProps,
} from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { UpdateMessageQueueProps } from 'src/shared/message-queue/domain/properties';
import { MessageQueueEventHandler } from 'src/shared/message-queue/infrastructure/event-handlers';
import { TransactionEventHandler } from './transaction-event.handler';

/**
 * Transaction Event Subscription Manager responsible for setting up and managing
 * the transaction event subscription from EventStore to the message queue system.
 *
 * This service handles:
 * - Live subscription for transaction events
 * - Routing transaction events to message queue handler
 * - Error handling and retry logic
 * - Subscription lifecycle management
 */
@Injectable()
export class TransactionEventSubscriptionManager
  implements OnModuleInit, OnModuleDestroy
{
  private subscriptions: Subscription[] = [];
  private isRunning = false;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly messageQueueEventHandler: MessageQueueEventHandler,
    private readonly transactionEventHandler: TransactionEventHandler,
  ) {}

  /**
   * Initialize transaction event subscriptions when the module starts
   */
  onModuleInit(): void {
    this.logger.log(
      {
        service: 'bull-transaction',
        boundedContext: 'bullTransaction',
        component: 'TransactionEventSubscriptionManager',
        method: 'onModuleInit',
      },
      'Starting transaction event subscription manager initialization',
    );

    try {
      void this.startTransactionEventSubscription();

      this.logger.log(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'onModuleInit',
        },
        'Transaction event subscription manager initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'onModuleInit',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to initialize transaction event subscription manager',
      );
      throw error;
    }
  }

  /**
   * Clean up subscriptions when the module is destroyed
   */
  onModuleDestroy(): void {
    this.logger.log(
      {
        service: 'bull-transaction',
        boundedContext: 'bullTransaction',
        component: 'TransactionEventSubscriptionManager',
        method: 'onModuleDestroy',
      },
      'Shutting down transaction event subscription manager',
    );

    this.isRunning = false;
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];

    this.logger.log(
      {
        service: 'bull-transaction',
        boundedContext: 'bullTransaction',
        component: 'TransactionEventSubscriptionManager',
        method: 'onModuleDestroy',
      },
      'Transaction event subscription manager shut down successfully',
    );
  }

  /**
   * Start the EventStore subscription for transaction events
   */
  private startTransactionEventSubscription(): void {
    // Subscribe to all transaction events using event type pattern
    const streamPattern = '$et-transaction.created.v1';

    this.logger.log(
      {
        service: 'bull-transaction',
        boundedContext: 'bullTransaction',
        component: 'TransactionEventSubscriptionManager',
        method: 'startTransactionEventSubscription',
        streamPattern,
        purpose:
          'TransactionCreatedEvent subscription - all transaction events',
      },
      'Setting up EventStore subscription for transaction.created.v1 events (live events only)',
    );

    try {
      // Subscribe to transaction events (live events only - no catchup needed)
      this.eventOrchestration.subscribeLiveOnly(
        streamPattern,
        (event: any, meta: EventStoreMetaProps) => {
          void this.processTransactionEvent(event, meta);
        },
      );
      this.isRunning = true;

      this.logger.log(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'startTransactionEventSubscription',
          streamPattern,
        },
        'Transaction event subscription setup completed successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'startTransactionEventSubscription',
          streamPattern,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to setup transaction event subscription',
      );
      throw error;
    }
  }

  /**
   * Process a transaction event by routing it to the message queue handler
   */
  private async processTransactionEvent(
    eventData: any,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    // Extract transaction ID safely
    const transactionId =
      (eventData as { id?: string })?.id || meta.aggregateId;
    const correlationId =
      meta.correlationId ||
      (eventData as { correlationId?: string })?.correlationId ||
      meta.aggregateId;

    this.logger.log(
      {
        service: 'bull-transaction',
        boundedContext: 'bullTransaction',
        component: 'TransactionEventSubscriptionManager',
        method: 'processTransactionEvent',
        eventType: meta.eventType,
        aggregateId: meta.aggregateId,
        transactionId,
      },
      'Processing transaction event for message queue routing',
    );

    try {
      // Transform the transaction event data to the format expected by MessageQueueEventHandler
      const messageQueueProps: UpdateMessageQueueProps = {
        id: transactionId,
        payload: {
          ...(eventData as Record<string, any>),
          eventType: meta.eventType,
          streamName: meta.stream,
          transactionId,
        },
        correlationId,
        scheduledAt: undefined, // Transaction events are immediate
        priority: 2, // High priority for transaction events
      };

      // FIRST: Execute business logic through TransactionEventHandler
      this.logger.log(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'processTransactionEvent',
          eventType: meta.eventType,
          transactionId,
          phase: 'BUSINESS_LOGIC',
        },
        'Executing transaction business logic before message queue routing',
      );

      await this.transactionEventHandler.handleTransactionEvent(
        messageQueueProps,
        meta,
      );

      // SECOND: Route to message queue handler for notifications
      this.logger.log(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'processTransactionEvent',
          eventType: meta.eventType,
          transactionId,
          phase: 'NOTIFICATION_ROUTING',
        },
        'Routing to message queue for notifications after business logic',
      );

      await this.messageQueueEventHandler.handleMessageQueueEvent(
        messageQueueProps,
        meta,
      );

      this.logger.log(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'processTransactionEvent',
          eventType: meta.eventType,
          aggregateId: meta.aggregateId,
          transactionId,
        },
        'Successfully processed transaction event and routed to message queue',
      );
    } catch (error) {
      this.logger.error(
        {
          service: 'bull-transaction',
          boundedContext: 'bullTransaction',
          component: 'TransactionEventSubscriptionManager',
          method: 'processTransactionEvent',
          eventType: meta.eventType,
          aggregateId: meta.aggregateId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to process transaction event for message queue routing',
      );
      throw error;
    }
  }
}
