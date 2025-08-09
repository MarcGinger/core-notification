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
import { MESSAGE_QUEUE_PRIORITIES, MessageQueueJobData } from '../properties';

/**
 * Service for managing Slack message queue operations
 * Handles job creation, scheduling, and queue management for Slack messages
 */
@Injectable()
export class MessageQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE)
    private readonly slackMessageQueue: Queue<MessageQueueJobData>,
  ) {}

  /**
   * Add a standard Slack message job to the queue
   */
  async addSlackMessageJob(
    messageData: MessageQueueJobData,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    },
  ) {
    return this.slackMessageQueue.add('send-slack-message', messageData, {
      priority: options?.priority || MESSAGE_QUEUE_PRIORITIES.NORMAL,
      delay: options?.delay || 0,
      attempts: options?.attempts || 4,
      removeOnComplete: 100,
      removeOnFail: 50,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Add an urgent/high-priority Slack message job
   */
  async addUrgentSlackMessageJob(messageData: MessageQueueJobData) {
    return this.slackMessageQueue.add('send-slack-message', messageData, {
      priority: MESSAGE_QUEUE_PRIORITIES.URGENT,
      delay: 0,
      attempts: 6, // More attempts for urgent messages
      removeOnComplete: 50,
      removeOnFail: 25,
      backoff: {
        type: 'exponential',
        delay: 1000, // Faster retry for urgent messages
      },
    });
  }

  /**
   * Schedule a Slack message for future delivery
   */
  async scheduleSlackMessage(
    messageData: MessageQueueJobData,
    scheduledAt: Date,
  ) {
    const delay = scheduledAt.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    return this.slackMessageQueue.add('send-slack-message', messageData, {
      delay,
      priority: MESSAGE_QUEUE_PRIORITIES.NORMAL,
      attempts: 3,
      removeOnComplete: 200,
      removeOnFail: 100,
    });
  }

  /**
   * Add multiple Slack message jobs in bulk
   */
  async addBulkSlackMessageJobs(
    messages: MessageQueueJobData[],
    options?: {
      priority?: number;
      batchSize?: number;
    },
  ): Promise<any[]> {
    const batchSize = options?.batchSize || 100;
    const priority = options?.priority || MESSAGE_QUEUE_PRIORITIES.NORMAL;
    const results: any[] = [];

    // Process in batches to avoid overwhelming the queue
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchJobs = batch.map((message, index) =>
        this.slackMessageQueue.add('send-slack-message', message, {
          priority,
          delay: index * 100, // Slight delay between messages to avoid rate limits
          attempts: 4,
          removeOnComplete: 100,
          removeOnFail: 50,
        }),
      );

      const batchResults = await Promise.all(batchJobs);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Retry a failed Slack message job with enhanced options
   */
  async retryFailedMessage(
    messageData: MessageQueueJobData,
    retryAttempt: number,
  ) {
    const enhancedData: MessageQueueJobData = {
      ...messageData,
      isRetry: true,
      retryAttempt,
    };

    return this.slackMessageQueue.add('send-slack-message', enhancedData, {
      priority: MESSAGE_QUEUE_PRIORITIES.HIGH, // Higher priority for retries
      delay: Math.min(retryAttempt * 5000, 30000), // Exponential backoff capped at 30s
      attempts: Math.max(4 - retryAttempt, 1), // Fewer attempts for manual retries
      removeOnComplete: 50,
      removeOnFail: 25,
    });
  }

  /**
   * Get Slack message queue statistics
   */
  async getQueueStats() {
    const counts = await this.slackMessageQueue.getJobCounts();
    const workers = await this.slackMessageQueue.getWorkers();

    return {
      ...counts,
      workers: workers.length,
      isPaused: await this.slackMessageQueue.isPaused(),
      name: this.slackMessageQueue.name,
    };
  }

  /**
   * Get waiting/delayed jobs for monitoring
   */
  async getWaitingJobs(start = 0, end = 50) {
    return this.slackMessageQueue.getJobs(['waiting', 'delayed'], start, end);
  }

  /**
   * Get failed jobs for analysis
   */
  async getFailedJobs(start = 0, end = 50) {
    return this.slackMessageQueue.getJobs(['failed'], start, end);
  }

  /**
   * Clean completed and failed jobs
   */
  async cleanQueue(
    maxAge = 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    limit = 1000,
  ) {
    const [completedCleaned, failedCleaned] = await Promise.all([
      this.slackMessageQueue.clean(maxAge, limit, 'completed'),
      this.slackMessageQueue.clean(maxAge, limit, 'failed'),
    ]);

    return {
      completedCleaned: Array.isArray(completedCleaned)
        ? completedCleaned.length
        : completedCleaned,
      failedCleaned: Array.isArray(failedCleaned)
        ? failedCleaned.length
        : failedCleaned,
      totalCleaned:
        (Array.isArray(completedCleaned)
          ? completedCleaned.length
          : completedCleaned) +
        (Array.isArray(failedCleaned) ? failedCleaned.length : failedCleaned),
    };
  }

  /**
   * Pause the Slack message queue
   */
  async pauseQueue() {
    await this.slackMessageQueue.pause();
  }

  /**
   * Resume the Slack message queue
   */
  async resumeQueue() {
    await this.slackMessageQueue.resume();
  }

  /**
   * Drain the queue (remove all waiting jobs)
   */
  async drainQueue() {
    await this.slackMessageQueue.drain();
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    const stats = await this.getQueueStats();
    const isPaused = await this.slackMessageQueue.isPaused();
    const counts = await this.slackMessageQueue.getJobCounts();

    return {
      healthy: !isPaused && stats.workers > 0,
      isPaused,
      hasWorkers: stats.workers > 0,
      pendingJobs: (counts.waiting || 0) + (counts.delayed || 0),
      failedJobs: counts.failed || 0,
      stats,
    };
  }
}
