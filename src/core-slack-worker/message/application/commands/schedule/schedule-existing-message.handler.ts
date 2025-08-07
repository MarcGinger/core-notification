/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { handleCommandError } from 'src/shared/application/commands';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { MessageExceptionMessage } from '../../../domain/exceptions';
import { ScheduleExistingMessageCommand } from './schedule-existing-message.command';

@CommandHandler(ScheduleExistingMessageCommand)
export class ScheduleExistingMessageHandler
  implements ICommandHandler<ScheduleExistingMessageCommand, string>
{
  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
  ) {}

  async execute(command: ScheduleExistingMessageCommand): Promise<string> {
    const { props } = command;

    try {
      // Queue job options
      const jobOptions = {
        priority: props.priority || QUEUE_PRIORITIES.HIGH,
        delay: props.scheduledAt
          ? Math.max(0, props.scheduledAt.getTime() - Date.now())
          : 0,
        attempts: 4,
        backoff: {
          type: 'exponential' as const,
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      };

      // Queue the existing message for delivery
      const job = await this.slackQueue.add(
        'deliver-slack-message',
        {
          messageId: props.messageId, // Use existing message ID
          tenant: props.tenant,
          channel: props.channel,
          renderedMessage: props.renderedMessage,
          correlationId: props.correlationId,
          configCode: props.configCode,
        },
        jobOptions,
      );

      return job.id?.toString() || '';
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
