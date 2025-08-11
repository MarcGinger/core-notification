/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Queue } from 'bullmq';
import {
  IGenericQueue,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from '../../domain/interfaces/generic-queue.interface';

/**
 * BullMQ implementation of the generic queue interface
 * Wraps BullMQ Queue to provide generic queue operations
 */
export class BullMQGenericQueue implements IGenericQueue {
  constructor(private readonly bullQueue: Queue) {}

  async add<T = any>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const job = await this.bullQueue.add(name, data, {
      delay: options?.delay,
      attempts: options?.attempts,
      priority: options?.priority,
      removeOnComplete:
        typeof options?.removeOnComplete === 'number'
          ? options.removeOnComplete
          : 100,
      removeOnFail:
        typeof options?.removeOnFail === 'number' ? options.removeOnFail : 50,
      jobId: options?.jobId,
      backoff: options?.backoff
        ? {
            type: options.backoff.type,
            delay: options.backoff.delay,
          }
        : undefined,
    });

    return {
      id: job.id!,
      name: job.name,
      data: job.data,
      opts: {
        delay: options?.delay,
        attempts: options?.attempts,
        priority: options?.priority,
        removeOnComplete: options?.removeOnComplete,
        removeOnFail: options?.removeOnFail,
        jobId: job.id,
      },
      progress: typeof job.progress === 'number' ? job.progress : 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  async addBulk<T = any>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>,
  ): Promise<QueueJob<T>[]> {
    // For simplicity, we'll add jobs one by one
    // This can be optimized later with actual bulk operations
    const results: QueueJob<T>[] = [];
    for (const job of jobs) {
      const result = await this.add(job.name, job.data, job.options);
      results.push(result);
    }
    return results;
  }

  async getJob<T = any>(jobId: string): Promise<QueueJob<T> | null> {
    const job = await this.bullQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id!,
      name: job.name,
      data: job.data,
      opts: {
        delay: job.opts.delay,
        attempts: job.opts.attempts,
        priority: job.opts.priority,
        removeOnComplete:
          typeof job.opts.removeOnComplete === 'number'
            ? job.opts.removeOnComplete
            : undefined,
        removeOnFail:
          typeof job.opts.removeOnFail === 'number'
            ? job.opts.removeOnFail
            : undefined,
        jobId: job.id,
      },
      progress: typeof job.progress === 'number' ? job.progress : 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.bullQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.bullQueue.getWaiting(),
      this.bullQueue.getActive(),
      this.bullQueue.getCompleted(),
      this.bullQueue.getFailed(),
      this.bullQueue.getDelayed(),
    ]);

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
    await this.bullQueue.clean(grace, 100, status);
  }
}
