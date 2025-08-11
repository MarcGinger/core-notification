/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  IGenericQueue,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from '../../domain/interfaces/generic-queue.interface';

/**
 * Simple BullMQ implementation of the generic queue interface
 * Minimal implementation focusing on core functionality
 * TODO: Replace with full BullMQ integration when type issues are resolved
 */
export class SimpleBullMQAdapter implements IGenericQueue {
  constructor(private readonly queueName: string) {}

  add<T = any>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    // TODO: Implement actual BullMQ queue.add() call
    console.log(
      `[SimpleBullMQAdapter] Adding job ${name} to queue ${this.queueName}`,
      { data, options },
    );

    return Promise.resolve({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      data,
      opts: options || {},
      progress: 0,
      returnvalue: undefined,
      failedReason: undefined,
      processedOn: undefined,
      finishedOn: undefined,
    });
  }

  async addBulk<T = any>(
    jobs: Array<{ name: string; data: T; options?: QueueJobOptions }>,
  ): Promise<QueueJob<T>[]> {
    const results: QueueJob<T>[] = [];
    for (const job of jobs) {
      const result = await this.add(job.name, job.data, job.options);
      results.push(result);
    }
    return results;
  }

  getJob<T = any>(jobId: string): Promise<QueueJob<T> | null> {
    console.log(
      `[SimpleBullMQAdapter] Getting job ${jobId} from queue ${this.queueName}`,
    );
    return Promise.resolve(null); // TODO: Implement actual lookup
  }

  removeJob(jobId: string): Promise<void> {
    console.log(
      `[SimpleBullMQAdapter] Removing job ${jobId} from queue ${this.queueName}`,
    );
    // TODO: Implement actual removal
    return Promise.resolve();
  }

  getStats(): Promise<QueueStats> {
    console.log(
      `[SimpleBullMQAdapter] Getting stats for queue ${this.queueName}`,
    );
    return Promise.resolve({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    });
  }

  pause(): Promise<void> {
    console.log(`[SimpleBullMQAdapter] Pausing queue ${this.queueName}`);
    // TODO: Implement actual pause
    return Promise.resolve();
  }

  resume(): Promise<void> {
    console.log(`[SimpleBullMQAdapter] Resuming queue ${this.queueName}`);
    // TODO: Implement actual resume
    return Promise.resolve();
  }

  clean(
    grace: number,
    status: 'completed' | 'failed' | 'active',
  ): Promise<void> {
    console.log(`[SimpleBullMQAdapter] Cleaning queue ${this.queueName}`, {
      grace,
      status,
    });
    // TODO: Implement actual clean
    return Promise.resolve();
  }
}
