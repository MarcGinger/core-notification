/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

// Module exports
export { GenericMessageQueueModule } from './generic-message-queue.module';

// Clean architecture types and interfaces
export * from './domain/interfaces/generic-queue.interface';
export * from './types';

// Constants for production use
export * from './domain/constants/priority.constants';
export * from './domain/constants/queue-names.constants';

// Infrastructure tokens for DI
export * from './infrastructure/tokens/queue.tokens';

// Job data type exports
export * from './infrastructure/job-data';

// Domain exports
export { UpdateMessageQueueProps } from './domain/properties/update-message-queue.model';

// Re-export commonly used constants from infrastructure
// Note: QUEUE_NAMES is already exported from domain/constants above
