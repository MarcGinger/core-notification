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
import { WorkerMessageResult } from '../../../domain/properties';
import { ProcessMessageUseCase } from '../../usecases';
import { ProcessMessageCommand } from './process-message.command';

@CommandHandler(ProcessMessageCommand)
export class ProcessMessageHandler
  implements ICommandHandler<ProcessMessageCommand, WorkerMessageResult>
{
  constructor(private readonly processMessageUseCase: ProcessMessageUseCase) {}

  async execute(command: ProcessMessageCommand): Promise<WorkerMessageResult> {
    const { user, props } = command;

    try {
      return await this.processMessageUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
