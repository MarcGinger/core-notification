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
import { BullMQModule } from 'src/shared/infrastructure/bullmq';
import { EventStoreSharedModule } from 'src/shared/infrastructure/event-store';
import { LoggerModule } from 'src/shared/logger';
import {
  DataProcessingStrategy,
  EmailMessageStrategy,
  MessageQueueEventHandler,
  MessageQueueEventSubscriptionManager,
  NotificationStrategy,
  SlackMessageStrategy,
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
    // Routing strategies
    SlackMessageStrategy,
    EmailMessageStrategy,
    NotificationStrategy,
    DataProcessingStrategy,

    // Main event handler that uses strategies
    MessageQueueEventHandler,

    // Event subscription manager
    MessageQueueEventSubscriptionManager,
  ],
  exports: [
    // Export for use in other modules
    MessageQueueEventHandler,
    MessageQueueEventSubscriptionManager,
    SlackMessageStrategy,
    EmailMessageStrategy,
    NotificationStrategy,
    DataProcessingStrategy,
  ],
})
export class GenericMessageQueueModule {}
