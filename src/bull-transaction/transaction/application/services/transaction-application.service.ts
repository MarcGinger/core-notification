/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { MessageQueueEventHandler } from 'src/shared/message-queue';
import { CreateTransactionCommand } from '../../application/commands';
import { ITransaction } from '../../domain/entities';
import { CreateTransactionProps } from '../../domain/properties';

// generate-api-service

@Injectable()
export class TransactionApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly messageQueueHandler: MessageQueueEventHandler,
  ) {}

  async create(
    user: IUserToken,
    dto: CreateTransactionProps,
  ): Promise<ITransaction> {
    const entity = await this.commandBus.execute<
      CreateTransactionCommand,
      ITransaction
    >(new CreateTransactionCommand(user, dto));

    // Send notification via message queue
    await this.sendTransactionNotification(entity, user, 'created');

    return entity;
  }

  /**
   * Send transaction notification via generic message queue
   * The message will be automatically routed to the appropriate queue
   * based on the messageType and payload content
   */
  private async sendTransactionNotification(
    transaction: ITransaction,
    user: IUserToken,
    action: 'created' | 'updated' | 'completed' | 'failed',
  ): Promise<void> {
    try {
      const messageData = {
        id: `transaction-${transaction.id}-${action}-${Date.now()}`,
        payload: {
          messageType: 'notification',
          notificationType: 'transaction',
          transactionId: transaction.id,
          action,
          transaction: {
            id: transaction.id,
            // Add other relevant transaction properties here
          },
          user: {
            id: user.sub,
            tenant: user.tenant,
          },
          timestamp: new Date().toISOString(),
        },
        correlationId: `transaction-${transaction.id}`,
        priority: action === 'failed' ? 1 : 5, // Higher priority for failures
      };

      const mockMeta = {
        occurredAt: new Date(),
        aggregateId: transaction.id,
        stream: `transaction-${transaction.id}`,
        eventType: `transaction.${action}.v1`,
        userId: user.sub,
        tenant: user.tenant || 'default',
        tenantId: user.tenant || 'default',
        username: user.preferred_username || user.sub,
        correlationId: `transaction-${transaction.id}`,
        aggregateType: 'Transaction',
        context: 'bull-transaction',
        service: 'bull-transaction',
        revision: undefined,
      };

      await this.messageQueueHandler.handleMessageQueueEvent(
        messageData,
        mockMeta,
      );
    } catch (error) {
      // Log error but don't fail the transaction creation
      console.error('Failed to send transaction notification:', error);
    }
  }
}
