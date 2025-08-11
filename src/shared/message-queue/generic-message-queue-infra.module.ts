/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullMQModule } from 'src/shared/infrastructure/bullmq';
import { LoggerModule } from 'src/shared/logger';

// Generic queue commands
import { GenericMessageQueueCommands } from './application/commands/generic';

// Infrastructure services
import { GenericMessageQueueService } from './infrastructure/services';

// Infrastructure providers
import { QueueRegistryProvider } from './infrastructure/providers';

/**
 * Generic Message Queue Infrastructure Module
 * Provides type-safe job enqueuing/scheduling across all domains
 *
 * This module is ONLY for infrastructure concerns:
 * - Enqueue jobs to queues
 * - Schedule jobs for later execution
 * - Retry/delay job operations
 * - Route jobs to appropriate queues
 *
 * Business logic and domain-specific commands belong in their respective domains.
 */
@Module({
  imports: [
    CqrsModule, // For command handling
    BullMQModule, // Provides queue access
    LoggerModule, // Provides logging
  ],
  providers: [
    // Queue registry
    QueueRegistryProvider,
    
    // Core queue services
    GenericMessageQueueService,

    // Generic queue commands
    ...GenericMessageQueueCommands,
  ],
  exports: [
    // Export services for domain modules to use
    GenericMessageQueueService,

    // Export commands for domain modules to import
    ...GenericMessageQueueCommands,
  ],
})
export class GenericMessageQueueInfraModule {
  /**
   * Configure with custom routing strategies if needed
   */
  static forFeature(options?: {
    customRoutingStrategy?: Provider;
  }): DynamicModule {
    return {
      module: GenericMessageQueueInfraModule,
      imports: [CqrsModule, BullMQModule, LoggerModule],
      providers: [
        QueueRegistryProvider,
        GenericMessageQueueService,
        ...GenericMessageQueueCommands,
        ...(options?.customRoutingStrategy
          ? [options.customRoutingStrategy]
          : []),
      ],
      exports: [GenericMessageQueueService, ...GenericMessageQueueCommands],
    };
  }
}
