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
import { IMessageQueue } from '../../../domain/entities';
import { MessageQueueExceptionMessageQueue } from '../../../domain/exceptions';
import { CreateMessageQueueUseCase } from '../../usecases';
import { CreateMessageQueueCommand } from './create-message-queue.command';

@CommandHandler(CreateMessageQueueCommand)
export class CreateMessageQueueHandler
  implements ICommandHandler<CreateMessageQueueCommand, IMessageQueue>
{
  constructor(
    private readonly messageQueueCreateUseCase: CreateMessageQueueUseCase,
  ) {}

  async execute(command: CreateMessageQueueCommand): Promise<IMessageQueue> {
    const { user, props } = command;
    try {
      return await this.messageQueueCreateUseCase.execute(user, props);
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
