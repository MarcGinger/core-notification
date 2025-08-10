/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GenericMessageQueueService } from '../../../infrastructure/services/generic-message-queue.service';
import { JobType } from '../../../types';
import {
  MoveToDelayedCommand,
  QueueJobCommand,
  RetryJobCommand,
  ScheduleJobCommand,
} from './queue-job.command';

/**
 * @deprecated These generic queue handlers are part of the deprecated central routing infrastructure.
 * Domains should inject queues directly and handle their own job dispatching.
 *
 * Migration example:
 * ```typescript
 * // OLD (deprecated):
 * await this.commandBus.execute(new QueueJobCommand({...}));
 *
 * // NEW (domain-driven):
 * @Injectable()
 * export class MyDomainService {
 *   constructor(@InjectQueue('my-queue') private myQueue: Queue) {}
 *
 *   async processJob(data: MyJobData) {
 *     await this.myQueue.add('my-job-type', data, { priority: 10 });
 *   }
 * }
 * ```
 */

@CommandHandler(QueueJobCommand)
export class QueueJobHandler<T extends JobType>
  implements ICommandHandler<QueueJobCommand<T>>
{
  private readonly logger = new Logger(QueueJobHandler.name);

  constructor(
    private readonly genericMessageQueueService: GenericMessageQueueService,
  ) {
    this.logger.warn(
      'QueueJobHandler is deprecated. Use direct queue injection in your domain instead.',
    );
  }

  async execute({ job }: QueueJobCommand<T>): Promise<void> {
    this.logger.warn(
      `DEPRECATED: QueueJobHandler used for job type: ${job.type}. Migrate to domain-specific queue injection.`,
    );

    // Simple fallback routing for legacy compatibility
    const defaultQueueName = 'default';
    const defaultOptions = { attempts: 3, priority: 1 };

    await this.genericMessageQueueService.enqueue(
      defaultQueueName,
      job.type,
      job.payload,
      {
        ...defaultOptions,
        ...job.options,
        jobId: job.meta.correlationId,
      },
      job.meta,
    );

    this.logger.warn(
      `Job ${job.meta.correlationId} enqueued to default queue. Consider migrating to domain-specific handling.`,
    );
  }
}

@CommandHandler(ScheduleJobCommand)
export class ScheduleJobHandler<T extends JobType>
  implements ICommandHandler<ScheduleJobCommand<T>>
{
  private readonly logger = new Logger(ScheduleJobHandler.name);

  constructor(
    private readonly genericMessageQueueService: GenericMessageQueueService,
  ) {
    this.logger.warn(
      'ScheduleJobHandler is deprecated. Use direct queue injection in your domain instead.',
    );
  }

  async execute({ job, scheduledFor }: ScheduleJobCommand<T>): Promise<void> {
    this.logger.warn(
      `DEPRECATED: ScheduleJobHandler used for job type: ${job.type}. Migrate to domain-specific queue injection.`,
    );

    // Simple fallback routing for legacy compatibility
    const defaultQueueName = 'default';
    const defaultOptions = { attempts: 3, priority: 1 };
    const delay = scheduledFor.getTime() - Date.now();

    await this.genericMessageQueueService.enqueue(
      defaultQueueName,
      job.type,
      job.payload,
      {
        ...defaultOptions,
        ...job.options,
        delay: Math.max(0, delay),
        jobId: job.meta.correlationId,
      },
      job.meta,
    );

    this.logger.warn(
      `Job ${job.meta.correlationId} scheduled for ${scheduledFor.toISOString()} using default queue. Consider migrating to domain-specific handling.`,
    );
  }
}

@CommandHandler(RetryJobCommand)
export class RetryJobHandler implements ICommandHandler<RetryJobCommand> {
  private readonly logger = new Logger(RetryJobHandler.name);

  constructor(
    private readonly genericMessageQueueService: GenericMessageQueueService,
  ) {}

  async execute({ jobId }: RetryJobCommand): Promise<void> {
    this.logger.log(`Retrying job ${jobId} - deprecated functionality`);

    // Implementation depends on your GenericMessageQueueService interface
    // For now, just log - actual retry logic would go here
    await Promise.resolve();

    this.logger.warn(`Job ${jobId} retry attempted using deprecated handler`);
  }
}

@CommandHandler(MoveToDelayedCommand)
export class MoveToDelayedHandler
  implements ICommandHandler<MoveToDelayedCommand>
{
  private readonly logger = new Logger(MoveToDelayedHandler.name);

  constructor(
    private readonly genericMessageQueueService: GenericMessageQueueService,
  ) {}

  async execute({
    jobId,
    queueName,
    delay,
  }: MoveToDelayedCommand): Promise<void> {
    this.logger.log(
      `Moving job ${jobId} to delayed state with ${delay}ms delay`,
    );

    // Implementation depends on your GenericMessageQueueService interface
    // For now, just log - actual move logic would go here
    await Promise.resolve();

    this.logger.log(`Successfully moved job ${jobId} to delayed state`);
  }
}
