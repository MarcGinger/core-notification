/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SlackMessageQueueService } from '../services/slack-message-queue.service';
import { SlackMessageJobData } from '../processors/slack-message.processor';

/**
 * Admin controller for direct queue management
 * This is separate from the main SlackMessageRequestController
 * and provides direct access to queue operations for admin purposes
 */
@ApiTags('Slack Queue Admin')
@Controller('admin/slack-queue')
export class SlackQueueAdminController {
  constructor(private readonly slackQueueService: SlackMessageQueueService) {}

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
      this.slackQueueService.getQueueStats(),
      this.slackQueueService.getQueueHealth(),
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
    return this.slackQueueService.getFailedJobs(0, 20);
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
    return this.slackQueueService.cleanQueue();
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
    await this.slackQueueService.pauseQueue();
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
    await this.slackQueueService.resumeQueue();
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
  async addDirectJob(@Body() jobData: SlackMessageJobData) {
    const job = await this.slackQueueService.addSlackMessageJob(jobData);
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
  async addUrgentJob(@Body() jobData: SlackMessageJobData) {
    const job = await this.slackQueueService.addUrgentSlackMessageJob(jobData);
    return {
      jobId: job.id,
      priority: 'urgent',
      message: 'Urgent job added to queue',
    };
  }
}
