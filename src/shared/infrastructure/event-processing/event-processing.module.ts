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
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessedEventEntity, ProcessedEventRepository } from './';

/**
 * Shared Event Processing Module
 *
 * Provides common event processing infrastructure for deduplication
 * across all notification services (Slack, Email, Teams, SMS, etc.)
 *
 * Features:
 * - Event deduplication using EventStore revision numbers
 * - Service-specific event tracking
 * - Processing status management
 * - Statistics and monitoring
 * - Cleanup utilities
 */
@Module({
  imports: [TypeOrmModule.forFeature([ProcessedEventEntity])],
  providers: [ProcessedEventRepository],
  exports: [ProcessedEventRepository, TypeOrmModule],
})
export class EventProcessingModule {}
