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
import { HandleSlackMessageFailureUseCase } from '../../usecases';
import { HandleSlackMessageFailureCommand } from './handle-slack-message-failure.command';

@CommandHandler(HandleSlackMessageFailureCommand)
export class HandleSlackMessageFailureHandler
  implements ICommandHandler<HandleSlackMessageFailureCommand, void>
{
  constructor(
    private readonly handleSlackMessageFailureUseCase: HandleSlackMessageFailureUseCase,
  ) {}

  async execute(command: HandleSlackMessageFailureCommand): Promise<void> {
    const { props } = command;

    try {
      await this.handleSlackMessageFailureUseCase.execute(props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
