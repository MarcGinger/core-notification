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
import { MessageExceptionMessage } from '../../../domain/exceptions';
import { QueueMessageCommand } from './queue-message.command';
import { QueueMessageUseCase } from '../../usecases/queue-message.usecase';

@CommandHandler(QueueMessageCommand)
export class QueueMessageHandler
  implements ICommandHandler<QueueMessageCommand, void>
{
  constructor(private readonly queueMessageUseCase: QueueMessageUseCase) {}

  async execute(command: QueueMessageCommand): Promise<void> {
    const { user, props } = command;

    try {
      await this.queueMessageUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
