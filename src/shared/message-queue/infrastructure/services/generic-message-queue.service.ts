/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGenericQueue } from '../../domain/interfaces/generic-queue.interface';
import { JobOptions, QueueMeta } from '../../types';

/**
 * Generic Message Queue Service
 * Provides type-safe job enqueuing to any queue implementation
 * Now technology-agnostic - supports BullMQ, RabbitMQ, etc.
 */
@Injectable()
export class GenericMessageQueueService {
  private queues: Map<string, IGenericQueue> = new Map();

  constructor(
    @Inject('QUEUE_REGISTRY')
    private readonly queueRegistry: Map<string, IGenericQueue>,
  ) {
    this.queues = queueRegistry;
  }

  /**
   * Get a queue by name with fallback to default
   */
  private getQueue(queueName: string): IGenericQueue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      // TODO: Remove this temporary fallback once queue registry is properly implemented
      throw new Error(
        `Queue '${queueName}' not found in registry. Queue registry is not yet fully implemented.`,
      );
    }
    return queue;
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
    const queue = this.getQueue(queueName);

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
