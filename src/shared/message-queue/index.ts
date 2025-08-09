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

// Configuration exports
export * from './domain/interfaces';

// Handler exports
export { MessageQueueEventHandler } from './infrastructure/event-handlers/message-queue-event.handler';

// Strategy exports
export {
  DataProcessingStrategy,
  EmailMessageStrategy,
  IMessageRoutingStrategy,
  NotificationStrategy,
  SlackMessageStrategy,
} from './infrastructure/event-handlers/message-queue-event.handler';

// Domain exports
export { UpdateMessageQueueProps } from './domain/properties/update-message-queue.model';

// Re-export commonly used constants from infrastructure
export { QUEUE_NAMES } from '../infrastructure/bullmq';
