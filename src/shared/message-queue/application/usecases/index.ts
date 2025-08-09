/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateMessageQueueUseCase } from './create-message-queue.usecase';
import { MessageQueueFailureUseCase } from './message-queue-failure.usecase';
import { ProcessMessageQueueUseCase } from './process-message-queue.usecase';
import { QueueMessageQueueUseCase } from './queue-message-queue.usecase';

// application/commands/index.ts
export const MessageQueueUseCases = [
  CreateMessageQueueUseCase,
  QueueMessageQueueUseCase,
  MessageQueueFailureUseCase,
  ProcessMessageQueueUseCase,
];

export {
  CreateMessageQueueUseCase,
  MessageQueueFailureUseCase,
  ProcessMessageQueueUseCase,
  QueueMessageQueueUseCase,
};
