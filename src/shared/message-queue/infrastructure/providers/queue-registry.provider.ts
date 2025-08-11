/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Provider } from '@nestjs/common';
import { IGenericQueue } from '../../domain/interfaces/generic-queue.interface';
import { SimpleBullMQAdapter } from '../adapters/simple-bullmq.adapter';

/**
 * Queue Registry Provider
 * Creates and manages the registry of all available queues
 */
export const QueueRegistryProvider: Provider = {
  provide: 'QUEUE_REGISTRY',
  useFactory: () => {
    const registry = new Map<string, IGenericQueue>();
    
    // Register simple adapters for testing
    registry.set('transaction', new SimpleBullMQAdapter('transaction'));
    registry.set('default', new SimpleBullMQAdapter('default'));
    
    return registry;
  },
  inject: [],
};
