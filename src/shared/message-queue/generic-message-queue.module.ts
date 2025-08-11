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
import { BullMQModule } from 'src/shared/infrastructure/bullmq';
import { EventStoreSharedModule } from 'src/shared/infrastructure/event-store';
import { LoggerModule } from 'src/shared/logger';

/**
 * Generic Message Queue Module
 * Provides infrastructure for domain-driven queue operations following clean architecture
 *
 * Each domain registers its own queues and handlers directly without shared configuration
 */
@Module({
  imports: [
    BullMQModule, // Provides queue access
    LoggerModule, // Provides logging
    EventStoreSharedModule, // Provides EventStore integration
  ],
  providers: [
    // Infrastructure providers for clean architecture
    // Domains register their own queue services directly
  ],
  exports: [
    BullMQModule, // Export BullMQ for domain modules
    LoggerModule, // Export logging for domain modules
    EventStoreSharedModule, // Export EventStore for domain modules
  ],
})
export class GenericMessageQueueModule {
  // Note: Legacy registerAsync method removed
  // Domains now register their own queue modules directly
}
