/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullMQConfigService } from './bullmq-config.service';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    // Register the root BullMQ configuration
    BullModule.forRootAsync({
      useClass: BullMQConfigService,
    }),
    // Register multiple queues
    BullModule.registerQueueAsync(
      {
        name: QUEUE_NAMES.EMAIL,
        useFactory: (configService: BullMQConfigService) =>
          configService.getEmailQueueConfig(),
        inject: [BullMQConfigService],
      },
      {
        name: QUEUE_NAMES.NOTIFICATION,
        useFactory: (configService: BullMQConfigService) =>
          configService.getNotificationQueueConfig(),
        inject: [BullMQConfigService],
      },
      {
        name: QUEUE_NAMES.DATA_PROCESSING,
        useFactory: (configService: BullMQConfigService) =>
          configService.getDataProcessingQueueConfig(),
        inject: [BullMQConfigService],
      },
      {
        name: QUEUE_NAMES.SLACK_MESSAGE,
        useFactory: (configService: BullMQConfigService) =>
          configService.getSlackMessageQueueConfig(),
        inject: [BullMQConfigService],
      },
    ),
  ],
  providers: [BullMQConfigService, QueueService],
  exports: [BullMQConfigService, QueueService, BullModule],
})
export class BullMQModule {}
