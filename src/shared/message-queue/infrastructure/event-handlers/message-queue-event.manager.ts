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
  Optional,
} from '@nestjs/common';
import { Subscription } from 'rxjs';
import {
  EventOrchestrationService,
  EventStoreMetaProps,
} from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { IMessageQueue } from '../../domain/entities';
import {
  EventSubscriptionConfig,
  MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG,
  MessageQueueEventSubscriptionConfig,
} from '../../domain/interfaces';
import { MessageQueueWorkerLoggingHelper } from '../../domain/value-objects';
import { MessageQueueEventHandler } from './message-queue-event.handler';

/**
 * Message projection manager responsible for setting up and managing
 * the message projection from EventStore streams.
 *
 * This service handles:
 * - Initial catchup from historical events
 * - Live subscription for new events
 * - Error handling and retry logic
 * - Projection lifecycle management
 */
@Injectable()
export class MessageQueueEventSubscriptionManager
  implements OnModuleInit, OnModuleDestroy
{
  private subscriptions: Subscription[] = [];
  private isRunning = false;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly sendMessageQueueEventHandler: MessageQueueEventHandler,
    @Optional()
    @Inject(MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG)
    private readonly subscriptionConfig?: MessageQueueEventSubscriptionConfig,
  ) {
    // Log the subscription configuration to debug strategy registration
    this.logger.log(
      {
        component: 'MessageQueueEventSubscriptionManager',
        method: 'constructor',
        hasSubscriptionConfig: !!this.subscriptionConfig,
        configDetails: this.subscriptionConfig
          ? {
              eventSubscriptionsCount:
                this.subscriptionConfig.eventSubscriptions?.length || 0,
              customStrategiesCount:
                this.subscriptionConfig.customStrategies?.length || 0,
              eventSubscriptions:
                this.subscriptionConfig.eventSubscriptions?.map((sub) => ({
                  streamPattern: sub.streamPattern,
                  purpose: sub.purpose,
                  description: sub.description,
                })),
              customStrategies: this.subscriptionConfig.customStrategies?.map(
                (strategy) => strategy.name,
              ),
            }
          : null,
      },
      `MessageQueueEventSubscriptionManager initialized with config: ${this.subscriptionConfig ? 'PROVIDED' : 'NOT PROVIDED'}`,
    );
  }

  /**
   * Initialize the projection on module startup
   */
  onModuleInit(): void {
    try {
      const logContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueEventSubscriptionManager',
          'onModuleInit',
        );

      this.logger.log(
        logContext,
        'Starting message projection manager initialization',
      );

      this.startProjection();

      this.logger.log(
        logContext,
        'Message projection manager initialized successfully',
      );
    } catch (error) {
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueEventSubscriptionManager',
          'onModuleInit',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

      this.logger.error(
        errorContext,
        'Failed to initialize message projection manager',
      );
      throw error;
    }
  }

  /**
   * Clean up subscriptions on module destruction
   */
  onModuleDestroy(): void {
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      'MessageQueueEventSubscriptionManager',
      'onModuleDestroy',
    );

    this.logger.log(logContext, 'Shutting down message projection manager');
    this.stopProjection();
  }

  /**
   * Get event subscriptions configuration
   */
  private getEventSubscriptions(): EventSubscriptionConfig[] {
    // Use injected configuration if available, otherwise fall back to default
    if (this.subscriptionConfig?.eventSubscriptions) {
      this.logger.log(
        {
          component: 'MessageQueueEventSubscriptionManager',
          method: 'getEventSubscriptions',
          source: 'injected configuration',
          subscriptionsCount: this.subscriptionConfig.eventSubscriptions.length,
          subscriptions: this.subscriptionConfig.eventSubscriptions.map(
            (sub) => ({
              streamPattern: sub.streamPattern,
              purpose: sub.purpose,
              description: sub.description,
            }),
          ),
        },
        'Using injected event subscriptions configuration',
      );
      return this.subscriptionConfig.eventSubscriptions;
    }

    // Default subscriptions for backward compatibility
    const defaultSubscriptions = [
      {
        streamPattern: '$et-message-queue.created.v1',
        purpose: 'MessageCreatedEvent subscription - all aggregates',
        description: 'message-queue.created.v1 events',
      },
    ];

    this.logger.log(
      {
        component: 'MessageQueueEventSubscriptionManager',
        method: 'getEventSubscriptions',
        source: 'default fallback',
        subscriptionsCount: defaultSubscriptions.length,
        subscriptions: defaultSubscriptions,
      },
      'Using default event subscriptions configuration (no injected config found)',
    );

    return defaultSubscriptions;
  }

  /**
   * Start the message projection with catchup and subscription
   */
  startProjection(): void {
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      'MessageQueueEventSubscriptionManager',
      'startProjection',
    );

    if (this.isRunning) {
      this.logger.warn(logContext, 'Message projection is already running');
      return;
    }

    try {
      this.isRunning = true;

      // Get event subscriptions from configuration
      const eventSubscriptions = this.getEventSubscriptions();

      // Set up subscriptions for each event type
      for (const subscription of eventSubscriptions) {
        const setupContext =
          MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
            'MessageQueueEventSubscriptionManager',
            'startProjection',
            undefined,
            undefined,
            {
              streamPattern: subscription.streamPattern,
              purpose: subscription.purpose,
            },
          );

        this.logger.log(
          setupContext,
          `Setting up EventStore subscription for ${subscription.description} (live events only)`,
        );

        // Set up live subscription only (skip catchup to prevent reprocessing historical events)
        this.eventOrchestration.subscribeLiveOnly(
          subscription.streamPattern,
          (event: IMessageQueue, meta: EventStoreMetaProps) => {
            void this.handleMessageQueueEvent(event, meta);
          },
        );

        const successContext =
          MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
            'MessageQueueEventSubscriptionManager',
            'startProjection',
            undefined,
            undefined,
            { streamPattern: subscription.streamPattern },
          );

        this.logger.log(
          successContext,
          `${subscription.description} subscription setup completed successfully`,
        );
      }

      const finalContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueEventSubscriptionManager',
          'startProjection',
        );

      this.logger.log(
        finalContext,
        'Message projection setup completed successfully',
      );
    } catch (error) {
      this.isRunning = false;

      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueEventSubscriptionManager',
          'startProjection',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

      this.logger.error(errorContext, 'Failed to start message projection');
      throw error;
    }
  }

  /**
   * Stop the message projection and clean up subscriptions
   */
  stopProjection(): void {
    const logContext = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      'MessageQueueEventSubscriptionManager',
      'stopProjection',
    );

    try {
      this.isRunning = false;

      // Clean up all subscriptions
      for (const subscription of this.subscriptions) {
        if (subscription && !subscription.closed) {
          subscription.unsubscribe();
        }
      }
      this.subscriptions = [];

      this.logger.log(logContext, 'Message projection stopped successfully');
    } catch (error) {
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueEventSubscriptionManager',
          'stopProjection',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

      this.logger.error(
        errorContext,
        'Error while stopping message projection',
      );
    }
  }

  /**
   * Handle message events and route them to the event handler
   */
  private async handleMessageQueueEvent(
    event: IMessageQueue,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Route to the Message Queue event handler
      await this.sendMessageQueueEventHandler.handleMessageQueueEvent(
        event,
        meta,
      );
    } catch (error) {
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueEventSubscriptionManager',
          'handleMessageQueueEvent',
          event?.correlationId,
          undefined,
          {
            event,
            meta,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

      this.logger.error(
        errorContext,
        'Error handling message event in event handler manager',
      );
    }
  }

  /**
   * Restart the projection
   */
  private async restartProjection(): Promise<void> {
    const context = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
      'MessageQueueEventSubscriptionManager',
      'restartProjection',
    );

    this.logger.warn(context, 'Restarting message projection');

    this.stopProjection();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    this.startProjection();
  }

  /**
   * Health check for the event handler
   */
  isHealthy(): boolean {
    // Simplified health check - just check if the manager is running
    // The simplified handler doesn't need complex health tracking
    const healthy = this.isRunning;

    if (!healthy) {
      const context = MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'MessageQueueEventSubscriptionManager',
        'isHealthy',
        undefined,
        undefined,
        {
          isRunning: this.isRunning,
        },
      );

      this.logger.warn(context, 'Message event handler health check failed');
    }

    return healthy;
  }
}
