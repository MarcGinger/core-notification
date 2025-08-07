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
import { HandleSlackMessageFailureHandler } from './handle-failure/handle-slack-message-failure.handler';
import { QueueSlackMessageHandler } from './queue/queue-slack-message.handler';
import { RenderMessageTemplateHandler } from './render/render-message-template.handler';

// All Message Command Handlers
export const MessageCommands = [
  CreateMessageHandler,
  HandleSlackMessageFailureHandler,
  QueueSlackMessageHandler,
  RenderMessageTemplateHandler,
];

// Export Commands
export * from './create/create-message.command';
export * from './handle-failure/handle-slack-message-failure.command';
export * from './queue/queue-slack-message.command';
export * from './render/render-message-template.command';

// Export Handlers
export * from './create/create-message.handler';
export * from './handle-failure/handle-slack-message-failure.handler';
export * from './queue/queue-slack-message.handler';
export * from './render/render-message-template.handler';
