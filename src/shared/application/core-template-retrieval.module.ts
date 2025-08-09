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
import { LoggerModule } from '../logger';
import {
  CoreTemplateRetrievalService,
  TEMPLATE_RETRIEVAL_SERVICE,
} from './services/template-retrieval/simple-template-retrieval.service';

/**
 * Simple module that provides generic template retrieval service.
 * Uses a mock implementation for now to avoid complex dependency issues.
 * This module should be imported by any module that needs template retrieval capabilities.
 */
@Module({
  imports: [LoggerModule],
  providers: [
    {
      provide: TEMPLATE_RETRIEVAL_SERVICE,
      useClass: CoreTemplateRetrievalService,
    },
  ],
  exports: [TEMPLATE_RETRIEVAL_SERVICE],
})
export class CoreTemplateRetrievalModule {}
