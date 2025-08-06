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
import { QueueSlackMessageUseCase } from '../../usecases';
import { QueueSlackMessageCommand } from './queue-slack-message.command';

@CommandHandler(QueueSlackMessageCommand)
export class QueueSlackMessageHandler
  implements ICommandHandler<QueueSlackMessageCommand, void>
{
  constructor(
    private readonly queueSlackMessageUseCase: QueueSlackMessageUseCase,
  ) {}

  async execute(command: QueueSlackMessageCommand): Promise<void> {
    const { props } = command;

    try {
      await this.queueSlackMessageUseCase.execute(props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
