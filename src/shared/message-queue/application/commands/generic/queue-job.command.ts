/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { JobEnvelope, JobType } from '../../../types';

/**
 * Generic command to enqueue a job immediately
 */
export class QueueJobCommand<T extends JobType> {
  constructor(public readonly job: JobEnvelope<T>) {}
}

/**
 * Generic command to schedule a job for later execution
 */
export class ScheduleJobCommand<T extends JobType> {
  constructor(
    public readonly job: JobEnvelope<T>,
    public readonly scheduledFor: Date,
  ) {}
}

/**
 * Generic command to retry a failed job
 */
export class RetryJobCommand {
  constructor(
    public readonly jobId: string,
    public readonly queueName: string,
  ) {}
}

/**
 * Generic command to move a job to delayed state
 */
export class MoveToDelayedCommand {
  constructor(
    public readonly jobId: string,
    public readonly queueName: string,
    public readonly delay: number,
  ) {}
}
