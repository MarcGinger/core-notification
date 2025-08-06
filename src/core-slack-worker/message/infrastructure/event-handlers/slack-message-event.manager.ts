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
import { ILogger } from 'src/shared/logger';
import { Subscription } from 'rxjs';
import {
  EventOrchestrationService,
  EventStoreMetaProps,
} from 'src/shared/infrastructure/event-store';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import { CreateMessageProps } from '../../domain/properties';
import { SendSlackMessageEventHandler } from './send-slack-message-event.handler';

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
export class SlackMessageEventSubscriptionManager
  implements OnModuleInit, OnModuleDestroy
{
  private subscriptions: Subscription[] = [];
  private isRunning = false;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly sendSlackMessageEventHandler: SendSlackMessageEventHandler,
  ) {}

  /**
   * Initialize the projection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      const logContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'SlackMessageEventSubscriptionManager',
        'onModuleInit',
      );

      this.logger.log(
        logContext,
        'Starting message projection manager initialization',
      );

      await this.startProjection();

      this.logger.log(
        logContext,
        'Message projection manager initialized successfully',
      );
    } catch (error) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SlackMessageEventSubscriptionManager',
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
    const logContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SlackMessageEventSubscriptionManager',
      'onModuleDestroy',
    );

    this.logger.log(logContext, 'Shutting down message projection manager');
    this.stopProjection();
  }

  /**
   * Start the message projection with catchup and subscription
   */
  async startProjection(): Promise<void> {
    const logContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SlackMessageEventSubscriptionManager',
      'startProjection',
    );

    if (this.isRunning) {
      this.logger.warn(logContext, 'Message projection is already running');
      return;
    }

    try {
      this.isRunning = true;

      // Use event type stream for MessageCreatedEvent
      // This captures all slack.message.created.v1 events across all aggregates
      const streamPattern = '$et-slack.message.created.v1'; // Event type stream

      const setupContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SlackMessageEventSubscriptionManager',
          'startProjection',
          undefined,
          undefined,
          {
            streamPattern,
            purpose: 'MessageCreatedEvent subscription - all aggregates',
          },
        );

      this.logger.log(
        setupContext,
        'Setting up EventStore subscription for slack.message.created.v1 events',
      );

      // Set up the projection with event handler
      await this.eventOrchestration.setupProjection(
        streamPattern,
        (event: CreateMessageProps, meta: EventStoreMetaProps) => {
          void this.handleMessageEvent(event, meta);
        },
      );

      // Mark projection as initialized after catchup completes
      this.sendSlackMessageEventHandler.markAsInitialized();

      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SlackMessageEventSubscriptionManager',
          'startProjection',
          undefined,
          undefined,
          { streamPattern },
        );

      this.logger.log(
        successContext,
        'Message projection setup completed successfully',
      );
    } catch (error) {
      this.isRunning = false;

      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SlackMessageEventSubscriptionManager',
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
    const logContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SlackMessageEventSubscriptionManager',
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
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SlackMessageEventSubscriptionManager',
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
  private async handleMessageEvent(
    event: CreateMessageProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Route to the Slack message event handler
      await this.sendSlackMessageEventHandler.handleMessageEvent(event, meta);
    } catch (error) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SlackMessageEventSubscriptionManager',
          'handleMessageEvent',
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
    const context = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SlackMessageEventSubscriptionManager',
      'restartProjection',
    );

    this.logger.warn(context, 'Restarting message projection');

    this.stopProjection();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    await this.startProjection();
  }

  /**
   * Health check for the event handler
   */
  isHealthy(): boolean {
    const healthy =
      this.isRunning && this.sendSlackMessageEventHandler.isHealthy();

    if (!healthy) {
      const context = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'SlackMessageEventSubscriptionManager',
        'isHealthy',
        undefined,
        undefined,
        {
          isRunning: this.isRunning,
          eventHandlerHealthy: this.sendSlackMessageEventHandler.isHealthy(),
        },
      );

      this.logger.warn(context, 'Message event handler health check failed');
    }

    return healthy;
  }
}
