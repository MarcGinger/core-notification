/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PRIORITY_LEVELS } from '../../domain/constants/priority.constants';
import {
  IGenericQueue,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from '../../domain/interfaces/generic-queue.interface';

/**
 * Production BullMQ Adapter
 *
 * Implements the IGenericQueue interface using BullMQ with Redis backing.
 * Provides a clean abstraction over BullMQ for domain services.
 * Follows the production specifications from COPILOT_INSTRUCTIONS.md
 */
@Injectable()
export class BullMQGenericQueue implements IGenericQueue, OnModuleDestroy {
  private readonly logger = new Logger(BullMQGenericQueue.name);
  constructor(private readonly bullQueue: Queue) {}

  async add<T = any>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    this.logger.debug(`Adding job ${name} to queue ${this.bullQueue.name}`);

    const job = await this.bullQueue.add(name, data, {
      delay: options?.delay,
      attempts: options?.attempts || 3,
      priority: options?.priority || PRIORITY_LEVELS.NORMAL,
      removeOnComplete: options?.removeOnComplete || 100,
      removeOnFail: options?.removeOnFail || 50,
      jobId: options?.jobId,
      backoff: options?.backoff
        ? {
            type: options.backoff.type,
            delay: options.backoff.delay,
          }
        : { type: 'exponential', delay: 2000 },
    });

    this.logger.debug(`Job ${name} added with ID ${job.id}`);
    return this.mapToQueueJob(job);
  }

  async addBulk<T = any>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>,
  ): Promise<QueueJob<T>[]> {
    this.logger.debug(
      `Adding bulk jobs (${jobs.length}) to queue ${this.bullQueue.name}`,
    );

    const bullJobs = jobs.map((job) => ({
      name: job.name,
      data: job.data,
      opts: {
        priority: job.options?.priority || PRIORITY_LEVELS.NORMAL,
        attempts: job.options?.attempts || 3,
        delay: job.options?.delay,
        removeOnComplete: job.options?.removeOnComplete || 100,
        removeOnFail: job.options?.removeOnFail || 50,
        jobId: job.options?.jobId,
        backoff: job.options?.backoff
          ? {
              type: job.options.backoff.type,
              delay: job.options.backoff.delay,
            }
          : { type: 'exponential', delay: 2000 },
      },
    }));

    const addedJobs = await this.bullQueue.addBulk(bullJobs);
    this.logger.debug(`Bulk jobs added: ${addedJobs.length}`);

    return addedJobs.map((job) => this.mapToQueueJob(job));
  }

  async getJob<T = any>(jobId: string): Promise<QueueJob<T> | null> {
    const job = await this.bullQueue.getJob(jobId);
    if (!job) {
      this.logger.debug(`Job ${jobId} not found`);
      return null;
    }

    return this.mapToQueueJob(job);
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.bullQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Job ${jobId} removed`);
    } else {
      this.logger.debug(`Job ${jobId} not found for removal`);
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

    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };

    this.logger.debug(`Queue stats for ${this.bullQueue.name}:`, stats);
    return stats;
  }

  async pause(): Promise<void> {
    await this.bullQueue.pause();
    this.logger.log(`Queue ${this.bullQueue.name} paused`);
  }

  async resume(): Promise<void> {
    await this.bullQueue.resume();
    this.logger.log(`Queue ${this.bullQueue.name} resumed`);
  }

  async clean(
    grace: number,
    status: 'completed' | 'failed' | 'active',
  ): Promise<void> {
    await this.bullQueue.clean(grace, 100, status);
    this.logger.log(
      `Queue ${this.bullQueue.name} cleaned: ${status} jobs older than ${grace}ms`,
    );
  }

  async onModuleDestroy() {
    this.logger.log(`Closing queue ${this.bullQueue.name}`);
    await this.bullQueue.close();
  }

  /**
   * Maps BullMQ Job to generic QueueJob interface
   */
  private mapToQueueJob<T = any>(job: Job): QueueJob<T> {
    return {
      id: job.id!,
      name: job.name,
      data: job.data as T,
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
        backoff: undefined, // Simplified for now
      },
      progress: typeof job.progress === 'number' ? job.progress : 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }
}
