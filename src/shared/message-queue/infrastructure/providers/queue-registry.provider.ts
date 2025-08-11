/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Provider } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../domain/constants/queue-names.constants';
import { BullMQGenericQueue } from '../adapters/bullmq-generic-queue.adapter';
import { QUEUE_TOKENS } from '../tokens/queue.tokens';

/**
 * Queue Registry Provider
 *
 * Creates and manages all BullMQ queues for the application.
 * Follows the production configuration from COPILOT_INSTRUCTIONS.md
 */
export const QueueRegistryProvider: Provider = {
  provide: QUEUE_TOKENS.QUEUE_REGISTRY,
  useFactory: () => {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    };

    const registry = new Map<string, BullMQGenericQueue>();

    // Register all production queues
    Object.values(QUEUE_NAMES).forEach((queueName) => {
      const bullQueue = new Queue(queueName, {
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      registry.set(queueName, new BullMQGenericQueue(bullQueue));
    });

    return registry;
  },
};
