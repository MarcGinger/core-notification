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
 * Generic job payload type - domains define their own specific types
 */
export type JobPayload = Record<string, any>;

export type JobType = string;

export type JobEnvelope<T extends JobType = JobType, P = JobPayload> = {
  type: T;
  payload: P;
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
