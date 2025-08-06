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
import { ConfigService } from '@nestjs/config';
import {
  SharedBullConfigurationFactory,
  BullRootModuleOptions,
} from '@nestjs/bullmq';
import { QUEUE_NAMES, QUEUE_PRIORITIES } from './queue.constants';

@Injectable()
export class BullMQConfigService implements SharedBullConfigurationFactory {
  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    return {
      connection: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD', ''),
        db: this.configService.get<number>('REDIS_DB', 0),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    };
  }

  /**
   * Get configuration for email queue
   */
  getEmailQueueConfig() {
    return {
      name: QUEUE_NAMES.EMAIL,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential' as const,
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        priority: QUEUE_PRIORITIES.NORMAL,
      },
    };
  }

  /**
   * Get configuration for notification queue
   */
  getNotificationQueueConfig() {
    return {
      name: QUEUE_NAMES.NOTIFICATION,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'fixed' as const,
          delay: 1500,
        },
        removeOnComplete: 200,
        removeOnFail: 100,
        priority: QUEUE_PRIORITIES.NORMAL,
      },
    };
  }

  /**
   * Get configuration for data processing queue
   */
  getDataProcessingQueueConfig() {
    return {
      name: QUEUE_NAMES.DATA_PROCESSING,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential' as const,
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 25,
        delay: 0, // Process immediately
        priority: QUEUE_PRIORITIES.LOW,
      },
    };
  }

  /**
   * Get configuration for slack message queue
   */
  getSlackMessageQueueConfig() {
    return {
      name: QUEUE_NAMES.SLACK_MESSAGE,
      defaultJobOptions: {
        attempts: 4,
        backoff: {
          type: 'exponential' as const,
          delay: 1000,
        },
        removeOnComplete: 150,
        removeOnFail: 75,
        priority: QUEUE_PRIORITIES.HIGH, // Higher priority for real-time messaging
      },
    };
  }

  /**
   * Get all queue configurations
   */
  getAllQueueConfigs() {
    return [
      this.getEmailQueueConfig(),
      this.getNotificationQueueConfig(),
      this.getDataProcessingQueueConfig(),
      this.getSlackMessageQueueConfig(),
    ];
  }
}
