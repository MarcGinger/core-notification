/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGenericQueue } from '../../domain/interfaces/generic-queue.interface';

/**
 * Supported Queue Implementations
 */
export type QueueImplementation = 'bullmq' | 'rabbitmq' | 'redis' | 'sqs';

/**
 * Queue Configuration
 */
export interface QueueConfig {
  implementation: QueueImplementation;
  connectionString?: string;
  options?: Record<string, any>;
}

/**
 * Queue Strategy Interface
 * Each queue implementation (BullMQ, RabbitMQ, etc.) implements this
 */
export interface IQueueStrategy {
  /**
   * Create a queue instance
   */
  createQueue(queueName: string, config: QueueConfig): Promise<IGenericQueue>;

  /**
   * Check if this strategy supports the given implementation
   */
  supportsImplementation(implementation: QueueImplementation): boolean;
}

/**
 * Queue Factory
 * Creates queues using the strategy pattern based on configuration
 */
@Injectable()
export class QueueFactory {
  private strategies: Map<QueueImplementation, IQueueStrategy> = new Map();

  constructor(
    @Inject('QUEUE_STRATEGIES')
    private readonly queueStrategies: IQueueStrategy[],
  ) {
    // Register all available strategies
    this.queueStrategies.forEach((strategy) => {
      if (strategy.supportsImplementation('bullmq')) {
        this.strategies.set('bullmq', strategy);
      }
      if (strategy.supportsImplementation('rabbitmq')) {
        this.strategies.set('rabbitmq', strategy);
      }
      if (strategy.supportsImplementation('redis')) {
        this.strategies.set('redis', strategy);
      }
      if (strategy.supportsImplementation('sqs')) {
        this.strategies.set('sqs', strategy);
      }
    });
  }

  /**
   * Create a queue using the appropriate strategy
   */
  async createQueue(
    queueName: string,
    config: QueueConfig,
  ): Promise<IGenericQueue> {
    const strategy = this.strategies.get(config.implementation);

    if (!strategy) {
      throw new Error(
        `Unsupported queue implementation: ${config.implementation}`,
      );
    }

    return await strategy.createQueue(queueName, config);
  }

  /**
   * Get all supported queue implementations
   */
  getSupportedImplementations(): QueueImplementation[] {
    return Array.from(this.strategies.keys());
  }
}
