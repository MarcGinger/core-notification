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
 * Standardized Queue Names
 *
 * Follows kebab-case naming convention and resource-based naming.
 * Each queue serves a specific business domain or function.
 */
export const QUEUE_NAMES = {
  // Transaction processing
  TRANSACTION_PROCESSING: 'transaction-processing',
  TRANSACTION_SETTLEMENT: 'transaction-settlement',

  // Notifications
  NOTIFICATION_EMAIL: 'notification-email',
  NOTIFICATION_PUSH: 'notification-push',

  // Slack integration
  SLACK_MESSAGES: 'slack-messages',
  SLACK_ALERTS: 'slack-alerts',

  // Background processing
  DATA_PROCESSING: 'data-processing',
  FILE_PROCESSING: 'file-processing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
