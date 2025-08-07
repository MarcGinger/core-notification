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
import { QueueMessageUseCase } from './queue-message.usecase';
import { HandleSlackMessageFailureUseCase } from './handle-slack-message-failure.usecase';
import { RenderMessageTemplateUseCase } from './render-message-template.usecase';
import { SendSlackMessageUseCase } from './send-slack-message.usecase';

// application/commands/index.ts
export const MessageUseCases = [
  CreateMessageUseCase,
  QueueMessageUseCase,
  HandleSlackMessageFailureUseCase,
  RenderMessageTemplateUseCase,
  SendSlackMessageUseCase,
];

export {
  CreateMessageUseCase,
  QueueMessageUseCase,
  HandleSlackMessageFailureUseCase,
  RenderMessageTemplateUseCase,
  SendSlackMessageUseCase,
};
