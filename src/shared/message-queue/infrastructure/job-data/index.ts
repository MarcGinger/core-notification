/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

/**
 * Base job data interface
 */
export interface BaseJobData {
  tenant: string;
  correlationId?: string;
  userId: string;
}

/**
 * Slack message job data
 */
export interface SlackJobData extends BaseJobData {
  messageId: string;
  channel: string;
  templateCode: string;
  payload: Record<string, any>;
  renderedMessage: string;
  scheduledAt?: string;
  priority: number;
}

/**
 * Email job data
 */
export interface EmailJobData extends BaseJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

/**
 * Notification job data
 */
export interface NotificationJobData extends BaseJobData {
  userId: string;
  type: string;
  message: string;
  metadata: Record<string, any>;
}

/**
 * Data processing job data
 */
export interface DataProcessingJobData extends BaseJobData {
  dataType: string;
  dataId: string;
  operation: string;
  parameters: Record<string, any>;
}

/**
 * Transaction notification job data
 */
export interface TransactionNotificationJobData extends BaseJobData {
  transactionId: string;
  action: 'created' | 'completed' | 'failed' | 'queued' | 'retrying';
  transaction: {
    from: string;
    to: string;
    amount: number;
    status: string;
  };
  timestamp: Date;
  metadata: Record<string, any>;
}
