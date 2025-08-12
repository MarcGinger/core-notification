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
import { MakerExceptionMessage } from './domain/exceptions';
import { MakerDomainService } from './domain/services';
import { MakerQuery } from './application/queries';
import { MakerCommands } from './application/commands';
import { MakerUseCases } from './application/usecases';
import { MakerApplicationService } from './application/services';
import { MakerRepository } from './infrastructure/repositories';
import { MakerController } from './infrastructure/controllers';
import {
  MakerMemoryProjection,
  MakerProjectionManager,
} from './infrastructure/projectors';

@Module({
  imports: [EventStoreSharedModule, LoggerModule],
  controllers: [MakerController],
  providers: [
    MakerDomainService,
    MakerRepository,
    MakerApplicationService,

    ...MakerQuery,
    ...MakerCommands,
    ...MakerUseCases,
    {
      provide: 'MAKER_EXCEPTION_MESSAGES',
      useValue: MakerExceptionMessage,
    },

    MakerMemoryProjection,
    MakerProjectionManager,
    {
      provide: 'MakerMemoryProjection',
      useExisting: MakerMemoryProjection,
    },
  ],
  exports: [
    MakerRepository,
    MakerMemoryProjection,
    MakerProjectionManager,
    'MakerMemoryProjection',
  ],
})
export class MakerModule {}
