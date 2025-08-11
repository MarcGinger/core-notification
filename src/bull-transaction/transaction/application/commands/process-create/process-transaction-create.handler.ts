/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { handleCommandError } from '../../../../../shared';
import { TransactionExceptionMessage } from '../../../domain';
import { ITransaction } from '../../../domain/entities';
import { ProcessTransactionCreateUseCase } from '../../usecases/process-create-transaction.usecase';
import { ProcessTransactionCreateCommand } from './process-transaction-create.command';

/**
 * Simple command handler that processes (completes) transactions
 * with no complex business logic - just marks them as completed
 */

@CommandHandler(ProcessTransactionCreateCommand)
export class ProcessTransactionCreateHandler
  implements ICommandHandler<ProcessTransactionCreateCommand>
{
  private readonly logger = new Logger(ProcessTransactionCreateHandler.name);

  constructor(
    private readonly processTransactionCreateUseCase: ProcessTransactionCreateUseCase,
  ) {}

  async execute(
    command: ProcessTransactionCreateCommand,
  ): Promise<ITransaction> {
    const { user, props } = command;
    try {
      return await this.processTransactionCreateUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, TransactionExceptionMessage.updateError);
      throw error;
    }
  }
}
