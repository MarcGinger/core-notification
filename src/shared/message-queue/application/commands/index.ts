/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

// Command Handlers
import { CreateMessageQueueHandler } from './create/create-message-queue.handler';
import { ProcessMessageQueueHandler } from './process/process-message.handler';
import { QueueMessageQueueHandler } from './queue/queue-message.handler';
import { ScheduleExistingMessageQueueHandler } from './schedule/schedule-existing-message.handler';

// All MessageQueue Command Handlers
export const MessageQueueCommands = [
  CreateMessageQueueHandler,
  QueueMessageQueueHandler,
  ProcessMessageQueueHandler,
  ScheduleExistingMessageQueueHandler,
];

// Export Commands
export * from './create/create-message-queue.command';
export * from './process/process-message.command';
export * from './queue/queue-message.command';
export * from './schedule/schedule-existing-message.command';

// Export Handlers
export * from './create/create-message-queue.handler';
export * from './process/process-message.handler';
export * from './queue/queue-message.handler';
