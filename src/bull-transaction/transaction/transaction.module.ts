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
import { SharedModule } from 'src/shared/shared.module';
import { GenericMessageQueueModule } from '../../shared/message-queue';
import { TransactionCommands } from './application/commands';
import { TransactionApplicationService } from './application/services';
import { TransactionUseCases } from './application/usecases';
import { TransactionExceptionMessage } from './domain/exceptions';
import { TransactionDomainService } from './domain/services';
import { TransactionApiAdapter } from './infrastructure/adapters';
import { TransactionController } from './infrastructure/controllers';
import {
  TransactionEventHandler,
  TransactionEventSubscriptionManager,
} from './infrastructure/event-handlers';
import { TransactionEventProcessor } from './infrastructure/processors';
import {
  TransactionMemoryProjection,
  TransactionProjectionManager,
} from './infrastructure/projectors';
import { TransactionRepository } from './infrastructure/repositories';
import { TransactionJobDispatcher } from './infrastructure/services';
import { TransactionMessageQueueService } from './infrastructure/services/transaction-message-queue.service';

@Module({
  imports: [
    SharedModule,
    EventStoreSharedModule,
    LoggerModule,
    BullMQModule,
    GenericMessageQueueModule, // Provides clean architecture infrastructure
  ],
  controllers: [TransactionController],
  providers: [
    TransactionDomainService,
    TransactionRepository,
    TransactionApplicationService,

    // Infrastructure adapters
    TransactionApiAdapter,

    // Job dispatchers
    TransactionJobDispatcher,
    {
      provide: 'ITransactionJobDispatcher',
      useExisting: TransactionJobDispatcher,
    },

    // Message queue service
    TransactionMessageQueueService,
    {
      provide: 'ITransactionMessageQueue',
      useExisting: TransactionMessageQueueService,
    },

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
