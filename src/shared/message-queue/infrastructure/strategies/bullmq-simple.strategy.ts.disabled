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
import { Queue } from 'bullmq';
import {
  IGenericQueue,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from '../../domain/interfaces/generic-queue.interface';
import {
  IQueueStrategy,
  QueueConfig,
  QueueImplementation,
} from '../factories/queue.factory';

/**
 * Simplified BullMQ implementation wrapper
 * This adapter makes BullMQ compatible with our generic queue interface
 */
class BullMQQueueWrapper implements IGenericQueue {
  constructor(private readonly bullQueue: Queue) {}

  async add(
    jobName: string,
    data: any,
    options?: QueueJobOptions,
  ): Promise<QueueJob> {
    const bullJob = await this.bullQueue.add(jobName, data, {
      delay: options?.delay,
      attempts: options?.attempts,
      priority: options?.priority,
      removeOnComplete: options?.removeOnComplete || 10,
      removeOnFail: options?.removeOnFail || 50,
      jobId: options?.jobId,
    });

    return {
      id: bullJob.id || '',
      name: bullJob.name,
      data: bullJob.data,
      opts: {
        delay: options?.delay,
        attempts: options?.attempts,
        priority: options?.priority,
        removeOnComplete: options?.removeOnComplete,
        removeOnFail: options?.removeOnFail,
        jobId: options?.jobId,
      },
      progress: 0, // Simplified - can be enhanced later
      returnvalue: undefined,
    };
  }

  async addBulk(
    jobs: Array<{ name: string; data: any; opts?: QueueJobOptions }>,
  ): Promise<QueueJob[]> {
    const bullJobs = await this.bullQueue.addBulk(
      jobs.map((job) => ({
        name: job.name,
        data: job.data,
        opts: {
          delay: job.opts?.delay,
          attempts: job.opts?.attempts,
          priority: job.opts?.priority,
          removeOnComplete: job.opts?.removeOnComplete || 10,
          removeOnFail: job.opts?.removeOnFail || 50,
          jobId: job.opts?.jobId,
        },
      })),
    );

    return bullJobs.map((bullJob) => ({
      id: bullJob.id || '',
      name: bullJob.name,
      data: bullJob.data,
      opts: {
        attempts: 3,
        priority: 5,
      },
      progress: 0,
      returnvalue: undefined,
    }));
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    const bullJob = await this.bullQueue.getJob(jobId);
    if (!bullJob) return null;

    return {
      id: bullJob.id || '',
      name: bullJob.name,
      data: bullJob.data,
      opts: {
        attempts: 3,
        priority: 5,
      },
      progress: 0,
      returnvalue: undefined,
    };
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.bullQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async getStats(): Promise<QueueStats> {
    const waiting = await this.bullQueue.getWaiting();
    const active = await this.bullQueue.getActive();
    const completed = await this.bullQueue.getCompleted();
    const failed = await this.bullQueue.getFailed();
    const delayed = await this.bullQueue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async pause(): Promise<void> {
    await this.bullQueue.pause();
  }

  async resume(): Promise<void> {
    await this.bullQueue.resume();
  }

  async clean(
    grace: number,
    status: 'completed' | 'failed' | 'active',
  ): Promise<void> {
    // Convert status to BullMQ status number
    const statusNum = status === 'completed' ? 0 : status === 'failed' ? 1 : 2;
    await this.bullQueue.clean(grace, statusNum as any);
  }
}

/**
 * BullMQ Strategy Implementation
 * Creates BullMQ queues wrapped in our generic interface
 */
@Injectable()
export class BullMQStrategy implements IQueueStrategy {
  async createQueue(
    queueName: string,
    config: QueueConfig,
  ): Promise<IGenericQueue> {
    // Extract Redis connection from config
    const redisConfig = config.options?.redis || {
      host: 'localhost',
      port: 6379,
    };

    const bullQueue = new Queue(queueName, {
      connection: redisConfig,
      ...config.options,
    });

    return new BullMQQueueWrapper(bullQueue);
  }

  supportsImplementation(implementation: QueueImplementation): boolean {
    return implementation === 'bullmq';
  }
}
