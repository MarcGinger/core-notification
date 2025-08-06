/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageEntity } from './message/infrastructure/entities';
import { ProcessedEventEntity } from 'src/shared/infrastructure';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProcessedEventEntity, MessageEntity])],
  exports: [TypeOrmModule],
})
export class EntityModule {}
