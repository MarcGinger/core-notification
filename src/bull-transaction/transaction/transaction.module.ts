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
import { EventStoreSharedModule } from 'src/shared/infrastructure';
import { BullMQModule } from 'src/shared/infrastructure/bullmq';
import { LoggerModule } from 'src/shared/logger';
// import { GenericMessageQueueModule } from 'src/shared/message-queue';
import { SharedModule } from 'src/shared/shared.module';
import { GenericMessageQueueModule } from '../../shared/message-queue';
import { TransactionCommands } from './application/commands';
import { TransactionApplicationService } from './application/services';
import { TransactionUseCases } from './application/usecases';
import { TransactionExceptionMessage } from './domain/exceptions';
import { TransactionDomainService } from './domain/services';
import { createTransactionEventSubscriptionConfig } from './infrastructure/config/transaction-event-subscription.config';
import { TransactionController } from './infrastructure/controllers';
import {
  TransactionEventHandler,
  TransactionEventSubscriptionManager,
} from './infrastructure/event-handlers';
import { TransactionMessageRoutingStrategy } from './infrastructure/message-routing';
import { TransactionEventProcessor } from './infrastructure/processors';
import {
  TransactionMemoryProjection,
  TransactionProjectionManager,
} from './infrastructure/projectors';
import { TransactionRepository } from './infrastructure/repositories';

@Module({
  imports: [
    SharedModule,
    EventStoreSharedModule,
    LoggerModule,
    BullMQModule,
    GenericMessageQueueModule.registerAsync({
      useFactory: createTransactionEventSubscriptionConfig,
    }),
  ],
  controllers: [TransactionController],
  providers: [
    TransactionDomainService,
    TransactionRepository,
    TransactionApplicationService,

    ...TransactionCommands,
    ...TransactionUseCases,
    {
      provide: 'TRANSACTION_EXCEPTION_MESSAGES',
      useValue: TransactionExceptionMessage,
    },

    TransactionMemoryProjection,
    TransactionProjectionManager,
    {
      provide: 'TransactionMemoryProjection',
      useExisting: TransactionMemoryProjection,
    },

    // Transaction-specific message routing strategy
    TransactionMessageRoutingStrategy,

    // Event processor for handling domain events
    TransactionEventProcessor,

    // Transaction event handler for business logic
    TransactionEventHandler,

    // Transaction event subscription manager for coordinating business logic and notifications
    TransactionEventSubscriptionManager,
  ],
  exports: [
    TransactionRepository,
    TransactionMemoryProjection,
    TransactionProjectionManager,
    'TransactionMemoryProjection',
    TransactionEventProcessor,
  ],
})
export class TransactionModule {}
