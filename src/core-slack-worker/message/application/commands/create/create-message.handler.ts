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
import { IMessage } from '../../../domain/entities';
import { MessageExceptionMessage } from '../../../domain/exceptions';
import { CreateMessageUseCase } from '../../usecases';
import { CreateMessageCommand } from './create-message.command';

@CommandHandler(CreateMessageCommand)
export class CreateMessageHandler
  implements ICommandHandler<CreateMessageCommand, IMessage>
{
  constructor(
    private readonly sendSlackMessageCreateUseCase: CreateMessageUseCase,
  ) {}

  async execute(command: CreateMessageCommand): Promise<IMessage> {
    const { user, props } = command;
    try {
      return await this.sendSlackMessageCreateUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
