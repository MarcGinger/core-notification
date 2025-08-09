/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { handleCommandError } from 'src/shared/application/commands';
import { MessageQueueExceptionMessageQueue } from '../../../domain/exceptions';
import { QueueMessageQueueUseCase } from '../../usecases';
import { QueueMessageQueueCommand } from './queue-message.command';

@CommandHandler(QueueMessageQueueCommand)
export class QueueMessageQueueHandler
  implements ICommandHandler<QueueMessageQueueCommand, void>
{
  constructor(
    private readonly queueMessageQueueUseCase: QueueMessageQueueUseCase,
  ) {}

  async execute(command: QueueMessageQueueCommand): Promise<void> {
    const { user, props } = command;

    try {
      await this.queueMessageQueueUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(
        error,
        null,
        MessageQueueExceptionMessageQueue.createError,
      );
      throw error;
    }
  }
}
