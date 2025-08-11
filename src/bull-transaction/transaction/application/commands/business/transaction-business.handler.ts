/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITransactionMessageQueue } from '../../../domain/services/transaction-message-queue.interface';
import {
  InitiateTransferCommand,
  RefundPaymentCommand,
  ValidateTransactionCommand,
} from './transaction-business.command';

/**
 * Business command handlers that validate domain rules
 * then enqueue jobs via domain interface (clean architecture approach)
 */

@CommandHandler(InitiateTransferCommand)
export class InitiateTransferHandler
  implements ICommandHandler<InitiateTransferCommand>
{
  private readonly logger = new Logger(InitiateTransferHandler.name);

  constructor(
    @Inject('ITransactionMessageQueue')
    private readonly messageQueue: ITransactionMessageQueue,
  ) {}

  async execute(command: InitiateTransferCommand): Promise<void> {
    const { fromAccount, toAccount, amount, currency, user, correlationId } =
      command;

    this.logger.log(
      `Initiating transfer: ${amount} ${currency} from ${fromAccount} to ${toAccount}, user: ${user.sub}`,
    );

    // Domain validation logic here
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    if (fromAccount === toAccount) {
      throw new Error('Cannot transfer to the same account');
    }

    // Enqueue the settlement job using domain interface with user context
    await this.messageQueue.enqueueSettlement(
      {
        txId: correlationId,
        amount,
        currency,
        fromAccount,
        toAccount,
      },
      user,
      correlationId,
    );

    this.logger.log(`Transfer ${correlationId} queued for settlement`);
  }
}

@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler
  implements ICommandHandler<RefundPaymentCommand>
{
  private readonly logger = new Logger(RefundPaymentHandler.name);

  constructor(
    @Inject('ITransactionMessageQueue')
    private readonly messageQueue: ITransactionMessageQueue,
  ) {}

  async execute(command: RefundPaymentCommand): Promise<void> {
    const { transactionId, reason, amount, user, correlationId } = command;

    this.logger.log(
      `Processing refund for transaction ${transactionId}: ${reason}, user: ${user.sub}`,
    );

    // Domain validation
    if (!transactionId) {
      throw new Error('Transaction ID is required for refund');
    }

    // Enqueue refund job using domain interface with user context
    await this.messageQueue.enqueueRefund(
      {
        txId: transactionId,
        reason,
        amount,
      },
      user,
      correlationId,
    );

    this.logger.log(`Refund ${correlationId} queued for processing`);
  }
}

@CommandHandler(ValidateTransactionCommand)
export class ValidateTransactionHandler
  implements ICommandHandler<ValidateTransactionCommand>
{
  private readonly logger = new Logger(ValidateTransactionHandler.name);

  constructor(
    @Inject('ITransactionMessageQueue')
    private readonly messageQueue: ITransactionMessageQueue,
  ) {}

  async execute(command: ValidateTransactionCommand): Promise<void> {
    const { transactionId, rules, user, correlationId } = command;

    this.logger.log(
      `Validating transaction ${transactionId} against ${rules.length} rules, user: ${user.sub}`,
    );

    // Domain validation
    if (!rules || rules.length === 0) {
      throw new Error('At least one validation rule is required');
    }

    // Enqueue validation job using domain interface with user context
    await this.messageQueue.enqueueValidation(
      {
        txId: transactionId,
        rules,
      },
      user,
      correlationId,
    );

    this.logger.log(
      `Validation ${correlationId} queued for transaction ${transactionId}`,
    );
  }
}
