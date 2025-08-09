/**
 * Enhanced Transaction Application Service
 * Demonstrates proper layered architecture with use cases
 */

import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import {
  CreateTransactionCommand,
  SendTransactionNotificationUseCase,
} from '../application';
import { CreateTransactionProps, ITransaction } from '../domain';

@Injectable()
export class EnhancedTransactionApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly sendNotificationUseCase: SendTransactionNotificationUseCase,
  ) {}

  /**
   * Create transaction with intelligent notification routing
   */
  async create(
    user: IUserToken,
    dto: CreateTransactionProps,
  ): Promise<ITransaction> {
    // 1. Execute the create command
    const entity = await this.commandBus.execute<
      CreateTransactionCommand,
      ITransaction
    >(new CreateTransactionCommand(user, dto));

    // 2. Use the use case for business logic encapsulation
    await this.sendNotificationUseCase.sendManagerApprovalRequest(
      entity,
      user,
      10000, // $10k threshold
    );

    return entity;
  }

  /**
   * Complete transaction with notification
   */
  async complete(transactionId: string, user: IUserToken): Promise<void> {
    // In a real implementation, you'd have a CompleteTransactionCommand
    // For now, we'll simulate getting the transaction
    const transaction = { id: transactionId } as ITransaction;

    // Send completion notification via use case
    await this.sendNotificationUseCase.execute(transaction, user, 'completed', {
      messageType: 'notification',
      priority: 3,
    });
  }

  /**
   * Handle transaction failure with critical alert
   */
  async handleFailure(
    transactionId: string,
    user: IUserToken,
    errorReason: string,
  ): Promise<void> {
    const transaction = { id: transactionId } as ITransaction;

    // Send critical alert via use case
    await this.sendNotificationUseCase.sendCriticalAlert(
      transaction,
      user,
      errorReason,
    );
  }

  /**
   * Process batch of transactions
   */
  async processBatch(
    transactionIds: string[],
    user: IUserToken,
  ): Promise<void> {
    // Simulate batch processing
    const transactions = transactionIds.map((id) => ({ id }) as ITransaction);

    // Send batch completion notification
    await this.sendNotificationUseCase.sendBatchCompletionNotification(
      transactions,
      user,
    );
  }
}
