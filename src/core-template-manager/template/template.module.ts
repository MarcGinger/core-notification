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
  AzureBlobStorageModule,
  EventStoreSharedModule,
  RedisConfigModule,
} from 'src/shared/infrastructure';
import { AjvSchemaValidationService } from 'src/shared/infrastructure/validation';
import { LoggerModule } from 'src/shared/logger';
import { TemplateCommands } from './application/commands';
import { TemplateQuery } from './application/queries';
import { TemplateApplicationService } from './application/services';
import { TemplateUseCases } from './application/usecases';
import { TemplateExceptionMessage } from './domain/exceptions';
import { TemplateDomainService } from './domain/services';
import { TemplateController } from './infrastructure/controllers';
import {
  TemplateProjectionManager,
  TemplateRedisProjection,
} from './infrastructure/projectors';
import { TemplateRepository } from './infrastructure/repositories';

@Module({
  imports: [
    EventStoreSharedModule,
    LoggerModule,
    RedisConfigModule,
    AzureBlobStorageModule,
  ],
  controllers: [TemplateController],
  providers: [
    TemplateDomainService,
    TemplateRepository,
    TemplateApplicationService,
    AjvSchemaValidationService,

    ...TemplateQuery,
    ...TemplateCommands,
    ...TemplateUseCases,
    {
      provide: 'TEMPLATE_EXCEPTION_MESSAGES',
      useValue: TemplateExceptionMessage,
    },

    TemplateRedisProjection,
    TemplateProjectionManager,
    {
      provide: 'TemplateRedisProjection',
      useExisting: TemplateRedisProjection,
    },
  ],
  exports: [
    TemplateRepository,
    TemplateRedisProjection,
    TemplateProjectionManager,
    'TemplateRedisProjection',
  ],
})
export class TemplateModule {}
