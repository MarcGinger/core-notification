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
import {
  BullMQModule,
  EventProcessingModule,
  EventStoreSharedModule,
} from 'src/shared/infrastructure';
import { LoggerModule } from 'src/shared/logger';
import { MessageCommands } from './application/commands';
import { MessageApplicationService } from './application/services';
import { MessageUseCases } from './application/usecases';
import { MessageExceptionMessage } from './domain/exceptions';
import {
  MessageDomainService,
  MessageTemplateDomainService,
  SlackDeliveryDomainService,
} from './domain/services';
import { MessageController } from './infrastructure/controllers';
import { SlackMessageRequestController } from './infrastructure/controllers/slack-message-request.controller';
import {
  SendSlackMessageEventHandler,
  SlackMessageEventSubscriptionManager,
} from './infrastructure/event-handlers';
import {
  MessageRepository,
  MessageSqlRepository,
} from './infrastructure/repositories';
// Event handlers removed - using Command/Handler pattern instead
import { CqrsModule } from '@nestjs/cqrs';
import { SlackMessageRequestService } from './application/services/slack-message-request.service';
import { SlackApiAdapter } from './infrastructure/adapters/slack-api.adapter';
import { SlackMessageProcessor } from './infrastructure/processors';
import { SlackMessageQueueService } from './infrastructure/services/slack-message-queue.service';

@Module({
  imports: [
    CqrsModule,
    EventStoreSharedModule,
    EventProcessingModule,
    BullMQModule,
    LoggerModule,
  ],
  controllers: [MessageController, SlackMessageRequestController],
  providers: [
    MessageDomainService,
    SlackDeliveryDomainService,
    MessageTemplateDomainService,
    MessageRepository,
    MessageSqlRepository,
    // ProcessedEventRepository is now provided by EventProcessingModule
    MessageApplicationService,
    SlackMessageRequestService,
    SlackMessageQueueService,

    // Infrastructure Adapters
    SlackApiAdapter,

    // Commands, and UseCases
    ...MessageCommands,
    ...MessageUseCases,

    // BullMQ Processors
    SlackMessageProcessor,

    // Exception Messages
    {
      provide: 'MESSAGE_EXCEPTION_MESSAGES',
      useValue: MessageExceptionMessage,
    },

    SendSlackMessageEventHandler,
    SlackMessageEventSubscriptionManager,
    {
      provide: 'SendSlackMessageEventHandler',
      useExisting: SendSlackMessageEventHandler,
    },
  ],
  exports: [
    MessageRepository,
    MessageSqlRepository,
    SendSlackMessageEventHandler,
    SlackMessageEventSubscriptionManager,
    SlackMessageRequestService,
    SlackMessageQueueService,
    'SendSlackMessageEventHandler',
  ],
})
export class MessageModule {}
