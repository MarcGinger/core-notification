/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { DynamicModule, Module } from '@nestjs/common';
import { BullMQModule } from 'src/shared/infrastructure/bullmq';
import { EventStoreSharedModule } from 'src/shared/infrastructure/event-store';
import { LoggerModule } from 'src/shared/logger';
import {
  MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG,
  MessageQueueEventSubscriptionConfig,
} from './domain/interfaces';
import {
  MessageQueueEventHandler,
  MessageQueueEventSubscriptionManager,
} from './infrastructure/event-handlers';

/**
 * Generic Message Queue Module
 * Provides routing strategies and event handling for any message type
 */
@Module({
  imports: [
    BullMQModule, // Provides queue access
    LoggerModule, // Provides logging
    EventStoreSharedModule, // Provides EventStore integration
  ],
  providers: [
    // Main event handler that uses strategies
    MessageQueueEventHandler,

    // Event subscription manager
    MessageQueueEventSubscriptionManager,
  ],
  exports: [
    // Export for use in other modules
    MessageQueueEventHandler,
    MessageQueueEventSubscriptionManager,
  ],
})
export class GenericMessageQueueModule {
  /**
   * Register async configuration for event subscriptions
   */
  static registerAsync(options: {
    useFactory: () =>
      | MessageQueueEventSubscriptionConfig
      | Promise<MessageQueueEventSubscriptionConfig>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: GenericMessageQueueModule,
      imports: [
        BullMQModule, // Provides queue access
        LoggerModule, // Provides logging
        EventStoreSharedModule, // Provides EventStore integration
      ],
      providers: [
        // Configuration provider
        {
          provide: MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },

        // Main event handler that uses strategies
        MessageQueueEventHandler,

        // Event subscription manager
        MessageQueueEventSubscriptionManager,
      ],
      exports: [
        // Export for use in other modules
        MessageQueueEventHandler,
        MessageQueueEventSubscriptionManager,
      ],
    };
  }
}
