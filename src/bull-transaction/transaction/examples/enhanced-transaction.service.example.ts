/**
 * Example: Enhanced Transaction Application Service
 * Demonstrates advanced message queue usage patterns
 */

import { Injectable } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import {
  MessageQueueEventHandler,
  UpdateMessageQueueProps,
} from 'src/shared/message-queue';

@Injectable()
export class EnhancedTransactionService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
    private readonly messageQueueHandler: MessageQueueEventHandler,
    private readonly logger: ILogger,
  ) {}

  /**
   * Example: Send different notification types based on transaction amount
   */
  async processTransaction(transaction: any, user: IUserToken): Promise<void> {
    const amount = transaction.amount || 0;

    if (amount > 10000) {
      // High-value transaction - send to Slack for immediate attention
      await this.sendSlackAlert(transaction, user);
    } else if (amount > 1000) {
      // Medium transaction - send email to managers
      await this.sendEmailNotification(transaction, user);
    } else {
      // Regular transaction - standard notification
      await this.sendStandardNotification(transaction, user);
    }
  }

  /**
   * Send urgent Slack notification for high-value transactions
   */
  private async sendSlackAlert(
    transaction: any,
    user: IUserToken,
  ): Promise<void> {
    const messageData: UpdateMessageQueueProps = {
      id: `transaction-slack-alert-${transaction.id}`,
      payload: {
        messageType: 'slack',
        channel: '#high-value-transactions',
        text: `🚨 High-value transaction alert: $${transaction.amount}`,
        attachments: [
          {
            color: 'danger',
            fields: [
              { title: 'Transaction ID', value: transaction.id, short: true },
              { title: 'Amount', value: `$${transaction.amount}`, short: true },
              { title: 'User', value: user.preferred_username, short: true },
              { title: 'Tenant', value: user.tenant, short: true },
            ],
          },
        ],
        urgency: 'high',
      },
      correlationId: `transaction-${transaction.id}`,
      priority: 1, // Highest priority
    };

    await this.sendMessage(messageData, transaction, user, 'high-value-alert');
  }

  /**
   * Send email notification to managers
   */
  private async sendEmailNotification(
    transaction: any,
    user: IUserToken,
  ): Promise<void> {
    const messageData: UpdateMessageQueueProps = {
      id: `transaction-email-${transaction.id}`,
      payload: {
        messageType: 'email',
        to: 'managers@company.com',
        cc: 'finance@company.com',
        subject: `Transaction Notification - $${transaction.amount}`,
        body: `
          <h3>Transaction Details</h3>
          <ul>
            <li><strong>ID:</strong> ${transaction.id}</li>
            <li><strong>Amount:</strong> $${transaction.amount}</li>
            <li><strong>User:</strong> ${user.preferred_username}</li>
            <li><strong>Tenant:</strong> ${user.tenant}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
        `,
        isHtml: true,
      },
      correlationId: `transaction-${transaction.id}`,
      priority: 3,
    };

    await this.sendMessage(
      messageData,
      transaction,
      user,
      'manager-notification',
    );
  }

  /**
   * Send standard notification to notification queue
   */
  private async sendStandardNotification(
    transaction: any,
    user: IUserToken,
  ): Promise<void> {
    const messageData: UpdateMessageQueueProps = {
      id: `transaction-notification-${transaction.id}`,
      payload: {
        messageType: 'notification',
        notificationType: 'transaction',
        title: 'Transaction Processed',
        message: `Transaction ${transaction.id} for $${transaction.amount} has been processed successfully.`,
        transactionId: transaction.id,
        amount: transaction.amount,
        userId: user.sub,
        tenant: user.tenant,
      },
      correlationId: `transaction-${transaction.id}`,
      priority: 5, // Normal priority
    };

    await this.sendMessage(
      messageData,
      transaction,
      user,
      'standard-notification',
    );
  }

  /**
   * Generic message sender with proper metadata construction
   */
  private async sendMessage(
    messageData: UpdateMessageQueueProps,
    transaction: any,
    user: IUserToken,
    action: string,
  ): Promise<void> {
    try {
      const metadata = {
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
        metadata,
      );

      this.logger.log(
        {
          component: 'EnhancedTransactionService',
          method: 'sendMessage',
          action,
          transactionId: transaction.id,
          messageType: messageData.payload?.messageType,
        },
        `Successfully queued ${action} message for transaction ${transaction.id}`,
      );
    } catch (error) {
      this.logger.error(
        {
          component: 'EnhancedTransactionService',
          method: 'sendMessage',
          action,
          transactionId: transaction.id,
          error: error.message,
        },
        `Failed to send ${action} message for transaction ${transaction.id}`,
        error.stack,
      );
      // Don't throw - notification failure shouldn't break transaction processing
    }
  }

  /**
   * Example: Bulk notification sending
   */
  async sendBulkTransactionSummary(
    transactions: any[],
    user: IUserToken,
    reportType: 'daily' | 'weekly' | 'monthly',
  ): Promise<void> {
    const totalAmount = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const transactionCount = transactions.length;

    const messageData: UpdateMessageQueueProps = {
      id: `bulk-transaction-summary-${reportType}-${Date.now()}`,
      payload: {
        messageType: 'email',
        to: 'reports@company.com',
        subject: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Transaction Summary`,
        body: `
          <h2>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Transaction Report</h2>
          <p><strong>Total Transactions:</strong> ${transactionCount}</p>
          <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
          <p><strong>Report Generated:</strong> ${new Date().toISOString()}</p>
          <p><strong>Generated by:</strong> ${user.preferred_username}</p>
        `,
        isHtml: true,
        reportType,
        transactionCount,
        totalAmount,
      },
      correlationId: `bulk-summary-${reportType}`,
      priority: 4,
    };

    const metadata = {
      occurredAt: new Date(),
      aggregateId: `bulk-report-${Date.now()}`,
      stream: `transaction-bulk-report`,
      eventType: `transaction.bulk-summary.${reportType}.v1`,
      userId: user.sub,
      tenant: user.tenant || 'default',
      tenantId: user.tenant || 'default',
      username: user.preferred_username || user.sub,
      correlationId: `bulk-summary-${reportType}`,
      aggregateType: 'BulkReport',
      context: 'bull-transaction',
      service: 'bull-transaction',
      revision: undefined,
    };

    await this.messageQueueHandler.handleMessageQueueEvent(
      messageData,
      metadata,
    );
  }
}
