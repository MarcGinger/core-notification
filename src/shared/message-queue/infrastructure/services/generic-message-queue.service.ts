/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobOptions, QueueMeta } from '../../types';

/**
 * Generic Message Queue Service
 * Provides type-safe job enqueuing to any queue
 */
@Injectable()
export class GenericMessageQueueService {
  private queues: Map<string, Queue> = new Map();

  constructor(
    @InjectQueue('default') private defaultQueue: Queue,
    @InjectQueue('transactions') private transactionsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('slack-messages') private slackQueue: Queue,
  ) {
    // Register all available queues
    this.queues.set('default', this.defaultQueue);
    this.queues.set('transactions', this.transactionsQueue);
    this.queues.set('notifications', this.notificationsQueue);
    this.queues.set('slack-messages', this.slackQueue);
  }

  /**
   * Enqueue a job to a specific queue
   */
  async enqueue<TPayload = any>(
    queueName: string,
    jobType: string,
    payload: TPayload,
    options?: JobOptions & { jobId?: string },
    meta?: QueueMeta,
  ): Promise<void> {
    const queue = this.queues.get(queueName) || this.defaultQueue;

    const jobData = {
      type: jobType,
      payload,
      meta: meta || { correlationId: this.generateCorrelationId() },
    };

    await queue.add(jobType, jobData, {
      priority: options?.priority || 1,
      delay: options?.delay || 0,
      attempts: options?.attempts || 3,
      removeOnComplete: options?.removeOnComplete || 100,
      removeOnFail: options?.removeOnFail || 50,
      jobId: options?.jobId || jobData.meta.correlationId,
      backoff: options?.backoff || {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Schedule a job for future execution
   */
  async schedule<TPayload = any>(
    queueName: string,
    jobType: string,
    payload: TPayload,
    scheduledFor: Date,
    options?: JobOptions,
    meta?: QueueMeta,
  ): Promise<void> {
    const delay = scheduledFor.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    await this.enqueue(
      queueName,
      jobType,
      payload,
      { ...options, delay },
      meta,
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
