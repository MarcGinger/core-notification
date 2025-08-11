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
import { EventStoreSharedModule } from '../infrastructure/event-store';
import { LoggerModule } from '../logger';
import { QUEUE_NAMES } from './domain/constants/queue-names.constants';
import { IGenericQueue } from './domain/interfaces/generic-queue.interface';
import { QueueRegistryProvider } from './infrastructure/providers/queue-registry.provider';
import { QUEUE_TOKENS } from './infrastructure/tokens/queue.tokens';

/**
 * Generic Message Queue Module
 *
 * Provides infrastructure for domain-driven queue operations following clean architecture.
 * Implements the production roadmap from COPILOT_INSTRUCTIONS.md
 *
 * Each domain registers its own queues and handlers directly without shared configuration
 */
@Module({
  imports: [
    LoggerModule, // Provides logging
    EventStoreSharedModule, // Provides EventStore integration
  ],
  providers: [
    // Infrastructure providers for clean architecture
    QueueRegistryProvider,

    // Default queue provider for direct injection
    {
      provide: QUEUE_TOKENS.GENERIC_QUEUE,
      useFactory: (registry: Map<string, IGenericQueue>) => {
        return registry.get(QUEUE_NAMES.DATA_PROCESSING);
      },
      inject: [QUEUE_TOKENS.QUEUE_REGISTRY],
    },
  ],
  exports: [
    QUEUE_TOKENS.QUEUE_REGISTRY, // Export queue registry for domains
    QUEUE_TOKENS.GENERIC_QUEUE, // Export default queue
    LoggerModule, // Export logging for domain modules
    EventStoreSharedModule, // Export EventStore for domain modules
  ],
})
export class GenericMessageQueueModule {
  // Note: Legacy registerAsync method removed
  // Domains now register their own queue modules directly using the registry
}
