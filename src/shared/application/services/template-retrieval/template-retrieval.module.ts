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
import { TEMPLATE_RETRIEVAL_SERVICE } from '.';
import { AzureBlobStorageModule } from '../../../infrastructure/azure-storage';
import { RedisConfigModule } from '../../../infrastructure/redis';
import { LoggerModule } from '../../../logger';
import { CoreTemplateRetrievalService } from './simple-template-retrieval.service';

/**
 * Module for template retrieval services.
 * This module provides generic template retrieval capabilities
 * that can be used by any template renderer across the application.
 */
@Module({
  imports: [LoggerModule, RedisConfigModule, AzureBlobStorageModule],
  providers: [
    {
      provide: TEMPLATE_RETRIEVAL_SERVICE,
      useClass: CoreTemplateRetrievalService,
    },
  ],
  exports: [
    TEMPLATE_RETRIEVAL_SERVICE,
    RedisConfigModule,
    AzureBlobStorageModule,
  ],
})
export class TemplateRetrievalModule {}
