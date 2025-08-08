/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessageJobData } from '../processors';
import { MessageQueueService } from '../services/message-queue.service';

/**
 * Admin controller for direct queue management
 * This is separate from the main MessageRequestController
 * and provides direct access to queue operations for admin purposes
 */
@ApiTags('Message Queue Admin')
@Controller('admin/message-queue')
export class MessageQueueAdminController {
  constructor(private readonly messageQueueService: MessageQueueService) {}

  /**
   * Get queue statistics and health
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get Slack message queue statistics',
    description:
      'Returns current queue statistics including job counts and health status',
  })
  async getQueueStats() {
    const [stats, health] = await Promise.all([
      this.messageQueueService.getQueueStats(),
      this.messageQueueService.getQueueHealth(),
    ]);

    return {
      stats,
      health,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get failed jobs for analysis
   */
  @Get('failed-jobs')
  @ApiOperation({
    summary: 'Get failed Slack message jobs',
    description: 'Returns a list of failed jobs for debugging and analysis',
  })
  async getFailedJobs() {
    return this.messageQueueService.getFailedJobs(0, 20);
  }

  /**
   * Clean completed and failed jobs
   */
  @Post('clean')
  @ApiOperation({
    summary: 'Clean old completed and failed jobs',
    description: 'Removes old completed and failed jobs to free up memory',
  })
  async cleanQueue() {
    return this.messageQueueService.cleanQueue();
  }

  /**
   * Pause the queue
   */
  @Post('pause')
  @ApiOperation({
    summary: 'Pause the Slack message queue',
    description: 'Temporarily stops processing new jobs',
  })
  async pauseQueue() {
    await this.messageQueueService.pauseQueue();
    return { message: 'Queue paused successfully' };
  }

  /**
   * Resume the queue
   */
  @Post('resume')
  @ApiOperation({
    summary: 'Resume the Slack message queue',
    description: 'Resumes processing jobs after being paused',
  })
  async resumeQueue() {
    await this.messageQueueService.resumeQueue();
    return { message: 'Queue resumed successfully' };
  }

  /**
   * Directly add a job to the queue (for testing)
   */
  @Post('add-job')
  @ApiOperation({
    summary: 'Directly add a job to the Slack queue',
    description:
      'For testing and admin purposes - bypasses the event-driven workflow',
  })
  async addDirectJob(@Body() jobData: MessageJobData) {
    const job = await this.messageQueueService.addSlackMessageJob(jobData);
    return {
      jobId: job.id,
      message: 'Job added directly to queue',
    };
  }

  /**
   * Add urgent job with high priority
   */
  @Post('add-urgent-job')
  @ApiOperation({
    summary: 'Add an urgent high-priority job',
    description: 'Adds a job with urgent priority for immediate processing',
  })
  async addUrgentJob(@Body() jobData: MessageJobData) {
    const job =
      await this.messageQueueService.addUrgentSlackMessageJob(jobData);
    return {
      jobId: job.id,
      priority: 'urgent',
      message: 'Urgent job added to queue',
    };
  }
}
