/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { MessageQueueEventHandler } from 'src/shared/message-queue';
import { ITransaction } from '../../../domain/entities';
import { SendTransactionNotificationCommand } from './send-transaction-notification.command';

@Injectable()
@CommandHandler(SendTransactionNotificationCommand)
export class SendTransactionNotificationHandler
  implements ICommandHandler<SendTransactionNotificationCommand, void>
{
  constructor(
    private readonly messageQueueHandler: MessageQueueEventHandler,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {}

  async execute(command: SendTransactionNotificationCommand): Promise<void> {
    const { transaction, user, action, options } = command;

    try {
      const messageData = {
        id: `transaction-${transaction.id}-${action}-${Date.now()}`,
        payload: {
          messageType: options?.messageType || 'notification',
          notificationType: 'transaction',
          transactionId: transaction.id,
          action,
          transaction: {
            id: transaction.id,
            // Add other relevant transaction properties here
            ...options?.additionalData,
          },
          user: {
            id: user.sub,
            tenant: user.tenant,
          },
          timestamp: new Date().toISOString(),
        },
        correlationId: `transaction-${transaction.id}`,
        priority: this.calculatePriority(action, options?.priority),
      };

      const metadata = this.buildEventMetadata(transaction, user, action);

      await this.messageQueueHandler.handleMessageQueueEvent(
        messageData,
        metadata,
      );

      this.logger.log(
        {
          component: 'SendTransactionNotificationHandler',
          method: 'execute',
          transactionId: transaction.id,
          action,
          messageType: messageData.payload.messageType,
        },
        `Successfully sent ${action} notification for transaction ${transaction.id}`,
      );
    } catch (error) {
      this.logger.error(
        {
          component: 'SendTransactionNotificationHandler',
          method: 'execute',
          transactionId: transaction.id,
          action,
          error: (error as Error).message,
        },
        `Failed to send ${action} notification for transaction ${transaction.id}`,
        (error as Error).stack,
      );

      // In a command handler, we might want to throw to indicate failure
      // but for notifications, we might want to just log and continue
      // Depending on your business requirements
      throw error;
    }
  }

  private calculatePriority(action: string, customPriority?: number): number {
    if (customPriority !== undefined) {
      return customPriority;
    }

    switch (action) {
      case 'failed':
        return 1; // Highest priority
      case 'created':
        return 3; // High priority
      case 'completed':
        return 4; // Medium priority
      case 'updated':
        return 5; // Normal priority
      default:
        return 5;
    }
  }

  private buildEventMetadata(
    transaction: ITransaction,
    user: IUserToken,
    action: string,
  ) {
    return {
      occurredAt: new Date(),
      aggregateId: String(transaction.id),
      stream: `transaction-${transaction.id}`,
      eventType: `transaction.${action}.v1`,
      userId: String(user.sub),
      tenant: String(user.tenant || 'default'),
      tenantId: String(user.tenant || 'default'),
      username: String(user.preferred_username || user.sub),
      correlationId: `transaction-${transaction.id}`,
      aggregateType: 'Transaction',
      context: 'bull-transaction',
      service: 'bull-transaction',
      revision: undefined,
    };
  }
}
