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
import { QUEUE_NAMES } from 'src/shared/infrastructure/bullmq';
import { TransactionJobData } from '../processors/transaction.processor';

/**
 * Service for dispatching transaction processing jobs to BullMQ workers
 * This demonstrates how to enqueue jobs that will be processed by TransactionProcessor
 */
@Injectable()
export class TransactionJobDispatcher {
  constructor(
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private readonly dataProcessingQueue: Queue,
  ) {}

  /**
   * Example: Dispatch a transaction processing job
   * This would typically be called from a controller or another service
   */
  async dispatchTransactionProcessing(
    jobData: TransactionJobData,
  ): Promise<void> {
    await this.dataProcessingQueue.add(
      'process-transaction', // Job name that TransactionProcessor will handle
      jobData,
      {
        // Job options
        priority: this.getPriorityValue(jobData.priority),
        delay: 0, // Process immediately
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay, then 4s, 8s, etc.
        },
        removeOnComplete: 10, // Keep last 10 completed jobs for debugging
        removeOnFail: 50, // Keep last 50 failed jobs for analysis
      },
    );
  }

  /**
   * Example: Dispatch a batch of transaction processing jobs
   */
  async dispatchBatchTransactionProcessing(
    jobsData: TransactionJobData[],
  ): Promise<void> {
    const jobs = jobsData.map((data) => ({
      name: 'process-transaction',
      data,
      opts: {
        priority: this.getPriorityValue(data.priority),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    await this.dataProcessingQueue.addBulk(jobs);
  }

  /**
   * Helper to convert priority to BullMQ priority values
   */
  private getPriorityValue(priority?: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high':
        return 10;
      case 'normal':
        return 5;
      case 'low':
        return 1;
      default:
        return 5;
    }
  }
}
