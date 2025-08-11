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
 * Generic Queue Job Options
 * Technology-agnostic options for queue jobs
 */
export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  priority?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
  jobId?: string;
}

/**
 * Generic Queue Job
 * Represents a job in any queue implementation
 */
export interface QueueJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: QueueJobOptions;
  progress: number;
  returnvalue?: any;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

/**
 * Generic Queue Statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Generic Queue Interface
 * Technology-agnostic interface that can be implemented by any queue system
 * (BullMQ, RabbitMQ, Redis, SQS, etc.)
 */
export interface IGenericQueue<T = any> {
  /**
   * Add a job to the queue
   */
  add(
    jobName: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>>;

  /**
   * Add multiple jobs to the queue in batch
   */
  addBulk(
    jobs: Array<{ name: string; data: T; opts?: QueueJobOptions }>,
  ): Promise<QueueJob<T>[]>;

  /**
   * Get job by ID
   */
  getJob(jobId: string): Promise<QueueJob<T> | null>;

  /**
   * Remove job by ID
   */
  removeJob(jobId: string): Promise<void>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<QueueStats>;

  /**
   * Pause the queue
   */
  pause(): Promise<void>;

  /**
   * Resume the queue
   */
  resume(): Promise<void>;

  /**
   * Clean completed/failed jobs
   */
  clean(
    grace: number,
    status: 'completed' | 'failed' | 'active',
  ): Promise<void>;
}
