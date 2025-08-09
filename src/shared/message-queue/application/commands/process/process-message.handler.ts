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
import { WorkerMessageQueueResult } from '../../../domain/properties';
import { ProcessMessageQueueUseCase } from '../../usecases';
import { ProcessMessageQueueCommand } from './process-message.command';

@CommandHandler(ProcessMessageQueueCommand)
export class ProcessMessageQueueHandler
  implements
    ICommandHandler<ProcessMessageQueueCommand, WorkerMessageQueueResult>
{
  constructor(
    private readonly processMessageQueueUseCase: ProcessMessageQueueUseCase,
  ) {}

  async execute(
    command: ProcessMessageQueueCommand,
  ): Promise<WorkerMessageQueueResult> {
    const { user, props } = command;

    try {
      return await this.processMessageQueueUseCase.execute(user, props);
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
