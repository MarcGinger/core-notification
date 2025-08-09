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
import { LoggerModule } from 'src/shared/logger';
import { EventStoreSharedModule } from 'src/shared/infrastructure';
import { TransactionExceptionMessage } from './domain/exceptions';
import { TransactionDomainService } from './domain/services';
import { TransactionCommands } from './application/commands';
import { TransactionUseCases } from './application/usecases';
import { TransactionApplicationService } from './application/services';
import { TransactionRepository } from './infrastructure/repositories';
import { TransactionController } from './infrastructure/controllers';
import {
  TransactionMemoryProjection,
  TransactionProjectionManager,
} from './infrastructure/projectors';

@Module({
  imports: [EventStoreSharedModule, LoggerModule],
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
  ],
  exports: [
    TransactionRepository,
    TransactionMemoryProjection,
    TransactionProjectionManager,
    'TransactionMemoryProjection',
  ],
})
export class TransactionModule {}
