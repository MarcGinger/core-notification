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
import { ITransaction } from '../../../domain/entities';
import { TransactionExceptionMessage } from '../../../domain/exceptions';
import { CreateTransactionUseCase } from '../../usecases';
import { CreateTransactionCommand } from './create-transaction.command';
@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler
  implements ICommandHandler<CreateTransactionCommand, ITransaction>
{
  constructor(
    private readonly transactionCreateUseCase: CreateTransactionUseCase,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<ITransaction> {
    const { user, props } = command;
    try {
      return await this.transactionCreateUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, TransactionExceptionMessage.createError);
      throw error;
    }
  }
}
