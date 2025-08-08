/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateMessageUseCase } from './create-message.usecase';
import { MessageFailureUseCase } from './message-failure.usecase';
import { ProcessMessageUseCase } from './process-message.usecase';
import { QueueMessageUseCase } from './queue-message.usecase';
import { RenderMessageTemplateUseCase } from './render-message-template.usecase';

// application/commands/index.ts
export const MessageUseCases = [
  CreateMessageUseCase,
  QueueMessageUseCase,
  MessageFailureUseCase,
  RenderMessageTemplateUseCase,
  ProcessMessageUseCase,
];

export {
  CreateMessageUseCase,
  MessageFailureUseCase,
  ProcessMessageUseCase,
  QueueMessageUseCase,
  RenderMessageTemplateUseCase,
};
