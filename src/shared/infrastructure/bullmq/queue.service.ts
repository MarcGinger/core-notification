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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, QUEUE_PRIORITIES } from './queue.constants';

/**
 * Example service demonstrating how to use multiple BullMQ queues
 * Note: Slack-specific functionality has been moved to SlackMessageQueueService
 * in the core-slack-worker message module
 */
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private dataProcessingQueue: Queue,
  ) {}

  /**
   * Add email job to the email queue
   */
  async addEmailJob(emailData: {
    to: string;
    subject: string;
    body: string;
    template?: string;
  }) {
    return this.emailQueue.add('send-email', emailData, {
      priority: QUEUE_PRIORITIES.NORMAL,
      delay: 0, // Send immediately
    });
  }

  /**
   * Add notification job to the notification queue
   */
  async addNotificationJob(notificationData: {
    userId: string;
    type: string;
    message: string;
    metadata?: Record<string, any>;
  }) {
    return this.notificationQueue.add('send-notification', notificationData, {
      priority: QUEUE_PRIORITIES.NORMAL,
    });
  }

  /**
   * Add data processing job to the data processing queue
   */
  async addDataProcessingJob(
    processingData: {
      dataType: string;
      dataId: string;
      operation: string;
      parameters?: Record<string, any>;
    },
    options?: {
      delay?: number;
      priority?: number;
    },
  ) {
    return this.dataProcessingQueue.add('process-data', processingData, {
      priority: options?.priority || QUEUE_PRIORITIES.LOW,
      delay: options?.delay || 0,
    });
  }

  /**
   * Schedule a delayed email
   */
  async scheduleDelayedEmail(
    emailData: {
      to: string;
      subject: string;
      body: string;
    },
    delayInMs: number,
  ) {
    return this.emailQueue.add('send-email', emailData, {
      delay: delayInMs,
      priority: QUEUE_PRIORITIES.NORMAL,
    });
  }

  /**
   * Bulk add jobs to multiple queues
   */
  async addBulkJobs(jobs: {
    emails?: Array<{ to: string; subject: string; body: string }>;
    notifications?: Array<{
      userId: string;
      type: string;
      message: string;
    }>;
    dataProcessing?: Array<{
      dataType: string;
      dataId: string;
      operation: string;
    }>;
  }) {
    const promises: Promise<any>[] = [];

    if (jobs.emails) {
      const emailJobs = jobs.emails.map((email) =>
        this.emailQueue.add('send-email', email),
      );
      promises.push(...emailJobs);
    }

    if (jobs.notifications) {
      const notificationJobs = jobs.notifications.map((notification) =>
        this.notificationQueue.add('send-notification', notification),
      );
      promises.push(...notificationJobs);
    }

    if (jobs.dataProcessing) {
      const dataJobs = jobs.dataProcessing.map((data) =>
        this.dataProcessingQueue.add('process-data', data),
      );
      promises.push(...dataJobs);
    }

    return Promise.all(promises);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [emailStats, notificationStats, dataStats] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.notificationQueue.getJobCounts(),
      this.dataProcessingQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      notification: notificationStats,
      dataProcessing: dataStats,
    };
  }

  /**
   * Pause all queues
   */
  async pauseAllQueues() {
    await Promise.all([
      this.emailQueue.pause(),
      this.notificationQueue.pause(),
      this.dataProcessingQueue.pause(),
    ]);
  }

  /**
   * Resume all queues
   */
  async resumeAllQueues() {
    await Promise.all([
      this.emailQueue.resume(),
      this.notificationQueue.resume(),
      this.dataProcessingQueue.resume(),
    ]);
  }
}
