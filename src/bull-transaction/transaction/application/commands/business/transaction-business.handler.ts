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
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueJobCommand } from 'src/shared/message-queue/application/commands/generic';
import {
  InitiateTransferCommand,
  RefundPaymentCommand,
  ValidateTransactionCommand,
} from './transaction-business.command';

/**
 * Business command handlers that validate domain rules
 * then enqueue jobs via generic message queue infrastructure
 */

@CommandHandler(InitiateTransferCommand)
export class InitiateTransferHandler
  implements ICommandHandler<InitiateTransferCommand>
{
  private readonly logger = new Logger(InitiateTransferHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: InitiateTransferCommand): Promise<void> {
    const { fromAccount, toAccount, amount, currency, correlationId } = command;

    this.logger.log(
      `Initiating transfer: ${amount} ${currency} from ${fromAccount} to ${toAccount}`,
    );

    // Domain validation logic here
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    if (fromAccount === toAccount) {
      throw new Error('Cannot transfer to the same account');
    }

    // Enqueue the settlement job using generic infrastructure
    await this.commandBus.execute(
      new QueueJobCommand({
        type: 'transaction.settle',
        payload: {
          txId: correlationId,
          amount,
          currency,
          fromAccount,
          toAccount,
        },
        meta: {
          correlationId,
          serviceContext: 'transaction-domain',
        },
        options: {
          attempts: 5,
          priority: 10,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    );

    this.logger.log(`Transfer ${correlationId} queued for settlement`);
  }
}

@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler
  implements ICommandHandler<RefundPaymentCommand>
{
  private readonly logger = new Logger(RefundPaymentHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: RefundPaymentCommand): Promise<void> {
    const { transactionId, reason, amount, correlationId } = command;

    this.logger.log(
      `Processing refund for transaction ${transactionId}: ${reason}`,
    );

    // Domain validation
    if (!transactionId) {
      throw new Error('Transaction ID is required for refund');
    }

    // Enqueue refund job
    await this.commandBus.execute(
      new QueueJobCommand({
        type: 'transaction.refund',
        payload: {
          txId: transactionId,
          reason,
          amount,
        },
        meta: {
          correlationId,
          serviceContext: 'transaction-domain',
        },
        options: {
          attempts: 3,
          priority: 8,
        },
      }),
    );

    this.logger.log(`Refund ${correlationId} queued for processing`);
  }
}

@CommandHandler(ValidateTransactionCommand)
export class ValidateTransactionHandler
  implements ICommandHandler<ValidateTransactionCommand>
{
  private readonly logger = new Logger(ValidateTransactionHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: ValidateTransactionCommand): Promise<void> {
    const { transactionId, rules, correlationId } = command;

    this.logger.log(
      `Validating transaction ${transactionId} against ${rules.length} rules`,
    );

    // Domain validation
    if (!rules || rules.length === 0) {
      throw new Error('At least one validation rule is required');
    }

    // Enqueue validation job
    await this.commandBus.execute(
      new QueueJobCommand({
        type: 'transaction.validate',
        payload: {
          txId: transactionId,
          rules,
        },
        meta: {
          correlationId,
          serviceContext: 'transaction-domain',
        },
        options: {
          attempts: 2,
          priority: 7,
        },
      }),
    );

    this.logger.log(
      `Validation ${correlationId} queued for transaction ${transactionId}`,
    );
  }
}
