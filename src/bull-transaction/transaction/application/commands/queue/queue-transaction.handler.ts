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
import { TransactionExceptionMessage } from '../../../domain/exceptions';
import { QueueTransactionUseCase } from '../../usecases';
import { QueueTransactionCommand } from './queue-transaction.command';

@CommandHandler(QueueTransactionCommand)
export class QueueTransactionHandler
  implements ICommandHandler<QueueTransactionCommand, void>
{
  constructor(
    private readonly queueTransactionUseCase: QueueTransactionUseCase,
  ) {}

  async execute(command: QueueTransactionCommand): Promise<void> {
    const { user, props } = command;

    try {
      await this.queueTransactionUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, TransactionExceptionMessage.createError);
      throw error;
    }
  }
}
