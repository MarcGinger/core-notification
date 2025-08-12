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
import { LoggerModule } from 'src/shared/logger';
import { MakerCommands } from './application/commands';
import { MakerQuery } from './application/queries';
import { MakerApplicationService } from './application/services';
import { MakerUseCases } from './application/usecases';
import { MakerExceptionMessage } from './domain/exceptions';
import { MakerDomainService } from './domain/services';
import { MakerEventConsumer } from './infrastructure/consumers/maker-event.consumer';
import { MakerController } from './infrastructure/controllers';
import {
  MakerMemoryProjection,
  MakerProjectionManager,
} from './infrastructure/projectors';
import { MakerRepository } from './infrastructure/repositories';

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
    {
      provide: 'IntegrationBus',
      useClass:
        require('../../shared/integration/adapters/inprocess-bus.adapter')
          .InProcessBus,
    },
    MakerEventConsumer,
  ],
  exports: [
    MakerRepository,
    MakerMemoryProjection,
    MakerProjectionManager,
    'MakerMemoryProjection',
    'IntegrationBus',
  ],
})
export class MakerModule {}
