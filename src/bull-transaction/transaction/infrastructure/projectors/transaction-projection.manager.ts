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
import { BullTransactionLoggingHelper } from '../../../shared/domain/value-objects';
import { SnapshotTransactionProps } from '../../domain/properties';
import { TransactionProjectionKeys } from '../../domain/value-objects/transaction-projection-keys';
import { TransactionMemoryProjection } from './transaction-memory.projection';

/**
 * Transaction projection manager responsible for setting up and managing
 * the transaction projection from EventStore streams.
 *
 * This service handles:
 * - Initial catchup from historical events
 * - Live subscription for new events
 * - Error handling and retry logic
 * - Projection lifecycle management
 */
@Injectable()
export class TransactionProjectionManager
  implements OnModuleInit, OnModuleDestroy
{
  private subscriptions: Subscription[] = [];
  private isRunning = false;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly eventOrchestration: EventOrchestrationService,
    private readonly TransactionMemoryProjection: TransactionMemoryProjection,
  ) {}

  /**
   * Initialize the projection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
        'TransactionProjectionManager',
        'onModuleInit',
      );

      this.logger.log(
        logContext,
        'Starting transaction projection manager initialization',
      );

      await this.startProjection();

      this.logger.log(
        logContext,
        'Transaction projection manager initialized successfully',
      );
    } catch (error) {
      const errorContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'TransactionProjectionManager',
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
        'Failed to initialize transaction projection manager',
      );
      throw error;
    }
  }

  /**
   * Clean up subscriptions on module destruction
   */
  onModuleDestroy(): void {
    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      'TransactionProjectionManager',
      'onModuleDestroy',
    );

    this.logger.log(logContext, 'Shutting down transaction projection manager');
    this.stopProjection();
  }

  /**
   * Start the transaction projection with catchup and subscription
   */
  async startProjection(): Promise<void> {
    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      'TransactionProjectionManager',
      'startProjection',
    );

    if (this.isRunning) {
      this.logger.warn(logContext, 'Transaction projection is already running');
      return;
    }

    try {
      this.isRunning = true;

      // Use domain value object for consistent stream pattern
      // This will capture all streams matching the pattern like banking.transaction.v1-tenant-USD
      const streamPattern =
        TransactionProjectionKeys.getEventStoreCategoryPattern();

      const setupContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'TransactionProjectionManager',
          'startProjection',
          undefined,
          undefined,
          {
            streamPattern,
            esdbPrefix: TransactionProjectionKeys.getEventStoreStreamPrefix(),
          },
        );

      this.logger.log(
        setupContext,
        'Setting up transaction projection for stream pattern',
      );

      // Set up the projection with event handler
      await this.eventOrchestration.setupProjection(
        streamPattern,
        (event: SnapshotTransactionProps, meta: EventStoreMetaProps) => {
          void this.handleTransactionEvent(event, meta);
        },
      );

      // Mark projection as initialized after catchup completes
      this.TransactionMemoryProjection.markAsInitialized();

      const successContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'TransactionProjectionManager',
          'startProjection',
          undefined,
          undefined,
          { streamPattern },
        );

      this.logger.log(
        successContext,
        'Transaction projection setup completed successfully',
      );
    } catch (error) {
      this.isRunning = false;

      const errorContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'TransactionProjectionManager',
          'startProjection',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

      this.logger.error(errorContext, 'Failed to start transaction projection');
      throw error;
    }
  }

  /**
   * Stop the transaction projection and clean up subscriptions
   */
  stopProjection(): void {
    const logContext = BullTransactionLoggingHelper.createEnhancedLogContext(
      'TransactionProjectionManager',
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

      this.logger.log(
        logContext,
        'Transaction projection stopped successfully',
      );
    } catch (error) {
      const errorContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'TransactionProjectionManager',
          'stopProjection',
          undefined,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

      this.logger.error(
        errorContext,
        'Error while stopping transaction projection',
      );
    }
  }

  /**
   * Handle transaction events and route them to the projection
   */
  private async handleTransactionEvent(
    event: SnapshotTransactionProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Filter for transaction-related events only

      await this.TransactionMemoryProjection.handleTransactionEvent(
        event,
        meta,
      );
    } catch (error) {
      const errorContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'TransactionProjectionManager',
          'handleTransactionEvent',
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
        'Error handling transaction event in projection manager',
      );
    }
  }

  /**
   * Restart the projection
   */
  private async restartProjection(): Promise<void> {
    const context = BullTransactionLoggingHelper.createEnhancedLogContext(
      'TransactionProjectionManager',
      'restartProjection',
    );

    this.logger.warn(context, 'Restarting transaction projection');

    this.stopProjection();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    await this.startProjection();
  }

  /**
   * Health check for the projection
   */
  async isHealthy(): Promise<boolean> {
    const healthy =
      this.isRunning && this.TransactionMemoryProjection.isHealthy();

    if (!healthy) {
      const context = BullTransactionLoggingHelper.createEnhancedLogContext(
        'TransactionProjectionManager',
        'isHealthy',
        undefined,
        undefined,
        {
          isRunning: this.isRunning,
          redisProjectionHealthy: this.TransactionMemoryProjection.isHealthy(),
        },
      );

      this.logger.warn(context, 'Transaction projection health check failed');
    }

    return healthy;
  }
}
