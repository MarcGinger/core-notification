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
import { ConfigModule } from '@nestjs/config';
import { AzureBlobStorageController } from './azure-blob-storage.controller';
import { AzureBlobStorageService } from './azure-blob-storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [AzureBlobStorageController],
  providers: [AzureBlobStorageService],
  exports: [AzureBlobStorageService],
})
export class AzureBlobStorageModule {}
