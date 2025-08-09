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
import { ITransaction } from '../../domain/entities';
import { SendTransactionNotificationCommand } from '../commands';

/**
 * Use Case: Send Transaction Notification
 *
 * This use case demonstrates how business logic can be encapsulated
 * and reused across different parts of the application.
 *
 * It can be called from:
 * - Application Services
 * - Event Handlers
 * - Scheduled Jobs
 * - External Integrations
 */
@Injectable()
export class SendTransactionNotificationUseCase {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Send notification for transaction with optional customization
   */
  async execute(
    transaction: ITransaction,
    user: IUserToken,
    action: 'created' | 'updated' | 'completed' | 'failed',
    options?: {
      messageType?: 'notification' | 'slack' | 'email';
      priority?: number;
      additionalData?: Record<string, any>;
    },
  ): Promise<void> {
    await this.commandBus.execute(
      new SendTransactionNotificationCommand(
        transaction,
        user,
        action,
        options,
      ),
    );
  }

  /**
   * Send high-priority alert for critical transactions
   */
  async sendCriticalAlert(
    transaction: ITransaction,
    user: IUserToken,
    reason: string,
  ): Promise<void> {
    await this.execute(transaction, user, 'failed', {
      messageType: 'slack',
      priority: 1,
      additionalData: {
        alertReason: reason,
        urgency: 'critical',
        requiresAttention: true,
      },
    });
  }

  /**
   * Send bulk completion notification
   */
  async sendBatchCompletionNotification(
    transactions: ITransaction[],
    user: IUserToken,
  ): Promise<void> {
    // Send individual notifications for each transaction
    const notifications = transactions.map((transaction) =>
      this.execute(transaction, user, 'completed', {
        messageType: 'email',
        priority: 4,
        additionalData: {
          batchProcessing: true,
          batchSize: transactions.length,
        },
      }),
    );

    await Promise.all(notifications);
  }

  /**
   * Send manager approval notification for high-value transactions
   */
  async sendManagerApprovalRequest(
    transaction: ITransaction,
    user: IUserToken,
    threshold: number = 10000,
  ): Promise<void> {
    // Only send if transaction amount exceeds threshold
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const amount = (transaction as any).amount || 0;

    if (amount >= threshold) {
      await this.execute(transaction, user, 'created', {
        messageType: 'email',
        priority: 2,
        additionalData: {
          requiresApproval: true,
          approvalThreshold: threshold,
          amountExceeded: amount - threshold,
        },
      });
    }
  }
}
