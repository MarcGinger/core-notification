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
import { CreateMessageHandler } from './create/create-message.handler';
import { ProcessMessageHandler } from './process/process-message.handler';
import { QueueMessageHandler } from './queue/queue-message.handler';
import { RenderMessageTemplateHandler } from './render/render-message-template.handler';
import { ScheduleExistingMessageHandler } from './schedule/schedule-existing-message.handler';

// All Message Command Handlers
export const MessageCommands = [
  CreateMessageHandler,
  QueueMessageHandler,
  ProcessMessageHandler,
  RenderMessageTemplateHandler,
  ScheduleExistingMessageHandler,
];

// Export Commands
export * from './create/create-message.command';
export * from './process/process-message.command';
export * from './queue/queue-message.command';
export * from './render/render-message-template.command';
export * from './schedule/schedule-existing-message.command';

// Export Handlers
export * from './create/create-message.handler';
export * from './process/process-message.handler';
export * from './queue/queue-message.handler';
export * from './render/render-message-template.handler';
