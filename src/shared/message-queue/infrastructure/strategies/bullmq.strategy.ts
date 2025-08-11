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
 * BullMQ implementation wrapper that implements the generic queue interface
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
      backoff: options?.backoff
        ? {
            type: options.backoff.type,
            delay: options.backoff.delay,
          }
        : undefined,
      removeOnComplete: options?.removeOnComplete,
      removeOnFail: options?.removeOnFail,
      jobId: options?.jobId,
    });

    // Convert BullMQ progress to number
    let progress = 0;
    try {
      if (typeof bullJob.progress === 'function') {
        const bullProgress = await bullJob.progress();
        progress = typeof bullProgress === 'number' ? bullProgress : 0;
      } else if (typeof bullJob.progress === 'number') {
        progress = bullJob.progress;
      }
    } catch {
      progress = 0;
    }

    return {
      id: bullJob.id!,
      name: bullJob.name,
      data: bullJob.data,
      opts: this.mapBullJobOptions(bullJob.opts),
      progress,
      returnvalue: bullJob.returnvalue,
      failedReason: bullJob.failedReason,
      processedOn: bullJob.processedOn,
      finishedOn: bullJob.finishedOn,
    };
  }

  private mapBullJobOptions(bullOpts: any): QueueJobOptions {
    return {
      delay: bullOpts.delay,
      attempts: bullOpts.attempts,
      priority: bullOpts.priority,
      backoff:
        bullOpts.backoff && typeof bullOpts.backoff === 'object'
          ? {
              type: bullOpts.backoff.type || 'exponential',
              delay: bullOpts.backoff.delay || 2000,
            }
          : undefined,
      removeOnComplete: bullOpts.removeOnComplete,
      removeOnFail: bullOpts.removeOnFail,
      jobId: bullOpts.jobId,
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
          removeOnComplete: job.opts?.removeOnComplete,
          removeOnFail: job.opts?.removeOnFail,
          jobId: job.opts?.jobId,
        },
      })),
    );

    return bullJobs.map((bullJob) => ({
      id: bullJob.id!,
      name: bullJob.name,
      data: bullJob.data,
      opts: bullJob.opts,
      progress: 0,
      returnvalue: bullJob.returnvalue,
    }));
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    const bullJob = await this.bullQueue.getJob(jobId);
    if (!bullJob) return null;

    return {
      id: bullJob.id!,
      name: bullJob.name,
      data: bullJob.data,
      opts: bullJob.opts,
      progress: await bullJob.progress(),
      returnvalue: bullJob.returnvalue,
      failedReason: bullJob.failedReason,
      processedOn: bullJob.processedOn,
      finishedOn: bullJob.finishedOn,
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
    await this.bullQueue.clean(grace, status);
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
