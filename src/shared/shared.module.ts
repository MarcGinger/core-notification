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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { LoggerModule } from 'src/shared/logger';
import { AzureBlobStorageModule } from './infrastructure/azure-storage';

@Module({
  imports: [
    CqrsModule,
    ConfigModule.forRoot(),
    LoggerModule,
    AzureBlobStorageModule,
  ],
  providers: [ConfigService],
  exports: [
    CqrsModule,
    ConfigModule,
    ConfigService,
    LoggerModule,
    AzureBlobStorageModule,
  ],
})
export class SharedModule {}
