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
import { TemplateRetrievalModule } from 'src/shared/application/services/template-retrieval';
import {
  BullMQModule,
  EventProcessingModule,
  EventStoreSharedModule,
} from 'src/shared/infrastructure';
import { LoggerModule } from 'src/shared/logger';
import { MessageCommands } from './application/commands';
import {
  MessageApplicationService,
  MessageService,
} from './application/services';
import { MessageUseCases } from './application/usecases';
import { MessageExceptionMessage } from './domain/exceptions';
import {
  MessageDeliveryDomainService,
  MessageDomainService,
  MessageTemplateDomainService,
} from './domain/services';
import { MessageController } from './infrastructure/controllers';
import { SlackMessageRequestController } from './infrastructure/controllers/slack-message-request.controller';
import {
  SlackMessageEventHandler,
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
import { MessageProcessor } from './infrastructure/processors';
import { MessageQueueService } from './infrastructure/services/message-queue.service';

@Module({
  imports: [
    CqrsModule,
    EventStoreSharedModule,
    EventProcessingModule,
    BullMQModule,
    LoggerModule,
    TemplateRetrievalModule,
  ],
  controllers: [MessageController, SlackMessageRequestController],
  providers: [
    MessageService,
    MessageDomainService,
    MessageDeliveryDomainService,
    MessageTemplateDomainService,
    MessageRepository,
    MessageSqlRepository,
    // ProcessedEventRepository is now provided by EventProcessingModule
    MessageApplicationService,
    SlackMessageRequestService,
    MessageQueueService,

    // Infrastructure Adapters
    SlackApiAdapter,

    // Commands, and UseCases
    ...MessageCommands,
    ...MessageUseCases,

    // BullMQ Processors
    MessageProcessor,

    // Exception Messages
    {
      provide: 'MESSAGE_EXCEPTION_MESSAGES',
      useValue: MessageExceptionMessage,
    },

    SlackMessageEventHandler,
    SlackMessageEventSubscriptionManager,
  ],
  exports: [
    MessageRepository,
    MessageSqlRepository,
    SlackMessageEventHandler,
    SlackMessageEventSubscriptionManager,
    SlackMessageRequestService,
    MessageQueueService,
  ],
})
export class MessageModule {}
