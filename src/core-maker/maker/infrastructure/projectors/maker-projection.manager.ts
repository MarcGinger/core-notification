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
import { CoreMakerLoggingHelper } from '../../../shared/domain/value-objects';
import { SnapshotMakerProps } from '../../domain/properties';
import { MakerProjectionKeys } from '../../domain/value-objects/maker-projection-keys';
import { MakerMemoryProjection } from './maker-memory.projection';

/**
 * Maker projection manager responsible for setting up and managing
 * the maker projection from EventStore streams.
 *
 * This service handles:
 * - Initial catchup from historical events
 * - Live subscription for new events
 * - Error handling and retry logic
 * - Projection lifecycle management
 */
@Injectable()
export class MakerProjectionManager implements OnModuleInit, OnModuleDestroy {
  private subscriptions: Subscription[] = [];
  private isRunning = false;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly MakerMemoryProjection: MakerMemoryProjection,
  ) {}

  /**
   * Initialize the projection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'onModuleInit',
      );

      this.logger.log(
        logContext,
        'Starting maker projection manager initialization',
      );

      await this.startProjection();

      this.logger.log(
        logContext,
        'Maker projection manager initialized successfully',
      );
    } catch (error) {
      const errorContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
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
        'Failed to initialize maker projection manager',
      );
      throw error;
    }
  }

  /**
   * Clean up subscriptions on module destruction
   */
  onModuleDestroy(): void {
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      'MakerProjectionManager',
      'onModuleDestroy',
    );

    this.logger.log(logContext, 'Shutting down maker projection manager');
    this.stopProjection();
  }

  /**
   * Start the maker projection with catchup and subscription
   */
  async startProjection(): Promise<void> {
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      'MakerProjectionManager',
      'startProjection',
    );

    if (this.isRunning) {
      this.logger.warn(logContext, 'Maker projection is already running');
      return;
    }

    try {
      this.isRunning = true;

      // Use domain value object for consistent stream pattern
      // This will capture all streams matching the pattern like banking.maker.v1-tenant-USD
      const streamPattern = MakerProjectionKeys.getEventStoreCategoryPattern();

      const setupContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'startProjection',
        undefined,
        undefined,
        {
          streamPattern,
          esdbPrefix: MakerProjectionKeys.getEventStoreStreamPrefix(),
        },
      );

      this.logger.log(
        setupContext,
        'Setting up maker projection for stream pattern',
      );

      // Set up the projection with event handler
      await this.eventOrchestration.setupProjection(
        streamPattern,
        (event: SnapshotMakerProps, meta: EventStoreMetaProps) => {
          void this.handleMakerEvent(event, meta);
        },
      );

      // Mark projection as initialized after catchup completes
      this.MakerMemoryProjection.markAsInitialized();

      const successContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'startProjection',
        undefined,
        undefined,
        { streamPattern },
      );

      this.logger.log(
        successContext,
        'Maker projection setup completed successfully',
      );
    } catch (error) {
      this.isRunning = false;

      const errorContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'startProjection',
        undefined,
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      this.logger.error(errorContext, 'Failed to start maker projection');
      throw error;
    }
  }

  /**
   * Stop the maker projection and clean up subscriptions
   */
  stopProjection(): void {
    const logContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      'MakerProjectionManager',
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

      this.logger.log(logContext, 'Maker projection stopped successfully');
    } catch (error) {
      const errorContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'stopProjection',
        undefined,
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      this.logger.error(errorContext, 'Error while stopping maker projection');
    }
  }

  /**
   * Handle maker events and route them to the projection
   */
  private async handleMakerEvent(
    event: SnapshotMakerProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Filter for maker-related events only

      await this.MakerMemoryProjection.handleMakerEvent(event, meta);
    } catch (error) {
      const errorContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'handleMakerEvent',
        event?.id,
        undefined,
        {
          event,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      this.logger.error(
        errorContext,
        'Error handling maker event in projection manager',
      );
    }
  }

  /**
   * Restart the projection
   */
  private async restartProjection(): Promise<void> {
    const context = CoreMakerLoggingHelper.createEnhancedLogContext(
      'MakerProjectionManager',
      'restartProjection',
    );

    this.logger.warn(context, 'Restarting maker projection');

    this.stopProjection();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    await this.startProjection();
  }

  /**
   * Health check for the projection
   */
  async isHealthy(): Promise<boolean> {
    const healthy = this.isRunning && this.MakerMemoryProjection.isHealthy();

    if (!healthy) {
      const context = CoreMakerLoggingHelper.createEnhancedLogContext(
        'MakerProjectionManager',
        'isHealthy',
        undefined,
        undefined,
        {
          isRunning: this.isRunning,
          redisProjectionHealthy: this.MakerMemoryProjection.isHealthy(),
        },
      );

      this.logger.warn(context, 'Maker projection health check failed');
    }

    return healthy;
  }
}
