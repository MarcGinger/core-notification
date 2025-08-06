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
import { CoreTemplateManagerLoggingHelper } from '../../../shared/domain/value-objects';
import { SnapshotTemplateProps } from '../../domain/properties';
import { TemplateProjectionKeys } from '../../domain/value-objects/template-projection-keys';
import { TemplateRedisProjection } from './template-redis.projection';

/**
 * Template projection manager responsible for setting up and managing
 * the template projection from EventStore streams.
 *
 * This service handles:
 * - Initial catchup from historical events
 * - Live subscription for new events
 * - Error handling and retry logic
 * - Projection lifecycle management
 */
@Injectable()
export class TemplateProjectionManager
  implements OnModuleInit, OnModuleDestroy
{
  private subscriptions: Subscription[] = [];
  private isRunning = false;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly TemplateRedisProjection: TemplateRedisProjection,
  ) {}

  /**
   * Initialize the projection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      const logContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
          'onModuleInit',
        );

      this.logger.log(
        logContext,
        'Starting template projection manager initialization',
      );

      await this.startProjection();

      this.logger.log(
        logContext,
        'Template projection manager initialized successfully',
      );
    } catch (error) {
      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
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
        'Failed to initialize template projection manager',
      );
      throw error;
    }
  }

  /**
   * Clean up subscriptions on module destruction
   */
  onModuleDestroy(): void {
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'TemplateProjectionManager',
        'onModuleDestroy',
      );

    this.logger.log(logContext, 'Shutting down template projection manager');
    this.stopProjection();
  }

  /**
   * Start the template projection with catchup and subscription
   */
  async startProjection(): Promise<void> {
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'TemplateProjectionManager',
        'startProjection',
      );

    if (this.isRunning) {
      this.logger.warn(logContext, 'Template projection is already running');
      return;
    }

    try {
      this.isRunning = true;

      // Use domain value object for consistent stream pattern
      // This will capture all streams matching the pattern like banking.template.v1-tenant-USD
      const streamPattern =
        TemplateProjectionKeys.getEventStoreCategoryPattern();

      const setupContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
          'startProjection',
          undefined,
          undefined,
          {
            streamPattern,
            esdbPrefix: TemplateProjectionKeys.getEventStoreStreamPrefix(),
          },
        );

      this.logger.log(
        setupContext,
        'Setting up template projection for stream pattern',
      );

      // Set up the projection with event handler
      await this.eventOrchestration.setupProjection(
        streamPattern,
        (event: SnapshotTemplateProps, meta: EventStoreMetaProps) => {
          void this.handleTemplateEvent(event, meta);
        },
      );

      // Mark projection as initialized after catchup completes
      this.TemplateRedisProjection.markAsInitialized();

      const successContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
          'startProjection',
          undefined,
          undefined,
          { streamPattern },
        );

      this.logger.log(
        successContext,
        'Template projection setup completed successfully',
      );
    } catch (error) {
      this.isRunning = false;

      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
          'startProjection',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

      this.logger.error(errorContext, 'Failed to start template projection');
      throw error;
    }
  }

  /**
   * Stop the template projection and clean up subscriptions
   */
  stopProjection(): void {
    const logContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'TemplateProjectionManager',
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

      this.logger.log(logContext, 'Template projection stopped successfully');
    } catch (error) {
      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
          'stopProjection',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

      this.logger.error(
        errorContext,
        'Error while stopping template projection',
      );
    }
  }

  /**
   * Handle template events and route them to the projection
   */
  private async handleTemplateEvent(
    event: SnapshotTemplateProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Filter for template-related events only

      await this.TemplateRedisProjection.handleTemplateEvent(event, meta);
    } catch (error) {
      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'TemplateProjectionManager',
          'handleTemplateEvent',
          event?.code,
          undefined,
          {
            event,
            meta,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

      this.logger.error(
        errorContext,
        'Error handling template event in projection manager',
      );
    }
  }

  /**
   * Restart the projection
   */
  private async restartProjection(): Promise<void> {
    const context = CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
      'TemplateProjectionManager',
      'restartProjection',
    );

    this.logger.warn(context, 'Restarting template projection');

    this.stopProjection();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    await this.startProjection();
  }

  /**
   * Health check for the projection
   */
  async isHealthy(): Promise<boolean> {
    const healthy = this.isRunning && this.TemplateRedisProjection.isHealthy();

    if (!healthy) {
      const context = CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'TemplateProjectionManager',
        'isHealthy',
        undefined,
        undefined,
        {
          isRunning: this.isRunning,
          redisProjectionHealthy: this.TemplateRedisProjection.isHealthy(),
        },
      );

      this.logger.warn(context, 'Template projection health check failed');
    }

    return healthy;
  }
}
