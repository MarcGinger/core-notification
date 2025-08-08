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
import { MessageFailureUseCase } from '../../usecases';
import { MessageFailureCommand } from './message-failure.command';

@CommandHandler(MessageFailureCommand)
export class MessageFailureHandler
  implements ICommandHandler<MessageFailureCommand, void>
{
  constructor(private readonly MessageFailureUseCase: MessageFailureUseCase) {}

  async execute(command: MessageFailureCommand): Promise<void> {
    const { user, props } = command;

    try {
      await this.MessageFailureUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
