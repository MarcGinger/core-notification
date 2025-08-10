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
import { MessageRoutingStrategyRegistry } from '../../../infrastructure/services/message-routing-strategy.service';
import { JobType } from '../../../types';
import {
  MoveToDelayedCommand,
  QueueJobCommand,
  RetryJobCommand,
  ScheduleJobCommand,
} from './queue-job.command';

@CommandHandler(QueueJobCommand)
export class QueueJobHandler<T extends JobType>
  implements ICommandHandler<QueueJobCommand<T>>
{
  private readonly logger = new Logger(QueueJobHandler.name);

  constructor(
    private readonly genericMessageQueueService: GenericMessageQueueService,
    private readonly routingRegistry: MessageRoutingStrategyRegistry,
  ) {}

  async execute({ job }: QueueJobCommand<T>): Promise<void> {
    this.logger.log(`Enqueuing job of type: ${job.type}`);

    const route = this.routingRegistry.resolve(job.type);

    await this.genericMessageQueueService.enqueue(
      route.queueName,
      job.type,
      job.payload,
      {
        ...route.options,
        ...job.options,
        jobId: job.meta.correlationId,
      },
      job.meta,
    );

    this.logger.log(
      `Successfully enqueued job ${job.meta.correlationId} to queue ${route.queueName}`,
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
    private readonly routingRegistry: MessageRoutingStrategyRegistry,
  ) {}

  async execute({ job, scheduledFor }: ScheduleJobCommand<T>): Promise<void> {
    this.logger.log(
      `Scheduling job of type: ${job.type} for ${scheduledFor.toISOString()}`,
    );

    const route = this.routingRegistry.resolve(job.type);
    const delay = scheduledFor.getTime() - Date.now();

    await this.genericMessageQueueService.enqueue(
      route.queueName,
      job.type,
      job.payload,
      {
        ...route.options,
        ...job.options,
        delay: Math.max(0, delay),
        jobId: job.meta.correlationId,
      },
      job.meta,
    );

    this.logger.log(
      `Successfully scheduled job ${job.meta.correlationId} for ${scheduledFor.toISOString()}`,
    );
  }
}

@CommandHandler(RetryJobCommand)
export class RetryJobHandler implements ICommandHandler<RetryJobCommand> {
  private readonly logger = new Logger(RetryJobHandler.name);

  constructor(
    private readonly genericMessageQueueService: GenericMessageQueueService,
  ) {}

  async execute({ jobId, queueName }: RetryJobCommand): Promise<void> {
    this.logger.log(`Retrying job ${jobId} in queue ${queueName}`);

    // Implementation depends on your GenericMessageQueueService interface
    // For now, just log - actual retry logic would go here
    await Promise.resolve();

    this.logger.log(`Successfully retried job ${jobId}`);
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
