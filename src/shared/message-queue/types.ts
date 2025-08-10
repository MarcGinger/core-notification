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
 * Generic Queue Types
 * Provides type-safe job enqueuing across all domains
 */

export interface QueueMeta {
  correlationId: string;
  tenant?: string;
  userId?: string;
  serviceContext?: string;
}

export interface JobOptions {
  delay?: number;
  attempts?: number;
  priority?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
}

/**
 * Central registry for all job types across domains
 * Each domain adds their job types here to maintain type safety
 */
export interface JobPayloadMap {
  // Notification domain
  'notification.send': {
    channel: string;
    templateCode?: string;
    payload: any;
    recipient: string;
  };

  // Transaction domain
  'transaction.settle': {
    txId: string;
    amount: number;
    currency: string;
    fromAccount: string;
    toAccount: string;
  };

  'transaction.refund': {
    txId: string;
    reason: string;
    amount?: number; // partial refund
  };

  'transaction.validate': {
    txId: string;
    rules: string[];
  };

  // Slack domain
  'slack.message.send': {
    channel: string;
    message: string;
    templateData?: any;
  };

  // Add more job types per domain as needed
}

export type JobType = keyof JobPayloadMap;

export type JobEnvelope<T extends JobType> = {
  type: T;
  payload: JobPayloadMap[T];
  meta: QueueMeta;
  options?: JobOptions;
};

/**
 * Queue routing configuration
 */
export interface QueueRoute {
  queueName: string;
  options?: JobOptions;
}

export interface IMessageRoutingStrategy {
  resolve(jobType: JobType): QueueRoute;
}
