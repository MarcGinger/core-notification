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
import { IUserToken } from 'src/shared/auth';
import {
  JOB_OPTIONS_TEMPLATES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import {
  IMessageRoutingStrategy,
  QUEUE_NAMES,
  SlackJobData,
  StandardJobOptions,
  UpdateMessageQueueProps,
} from 'src/shared/message-queue';

/**
 * Slack message routing strategy
 * Routes Slack-specific messages to the Slack message queue
 */
@Injectable()
export class SlackMessageRoutingStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      SlackJobData
    >
{
  /**
   * Determines if this strategy can handle the given event
   */
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload = eventData.payload as any;
    return Boolean(
      meta.stream?.includes('slack') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        payload?.channel?.startsWith('#') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        payload?.channel?.startsWith('@') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.messageType === 'slack',
    );
  }

  /**
   * Returns the target queue name for this strategy
   */
  getQueueName(): string {
    return QUEUE_NAMES.SLACK_MESSAGE;
  }

  /**
   * Returns the job type/name for this strategy
   */
  getJobType(): string {
    return 'send-slack-message';
  }

  /**
   * Returns job options for the queue
   */
  getJobOptions(eventData: UpdateMessageQueueProps): StandardJobOptions {
    return {
      ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
      priority: eventData.priority || QUEUE_PRIORITIES.NORMAL,
      delay: eventData.scheduledAt
        ? new Date(eventData.scheduledAt).getTime() - Date.now()
        : 0,
    };
  }

  /**
   * Transforms event data into Slack job data
   */
  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): SlackJobData {
    return {
      messageId: eventData.id,
      tenant: user.tenant || 'unknown',
      channel: (eventData.payload?.channel as string) || '#general',
      templateCode: (eventData.payload?.templateCode as string) || 'default',
      payload: eventData.payload || {},
      renderedMessage:
        (eventData.payload?.renderedMessage as string) ||
        'Default message content',
      scheduledAt: eventData.scheduledAt?.toISOString(),
      correlationId: eventData.correlationId || 'unknown',
      priority: eventData.priority || 1,
      userId: user.sub,
    };
  }
}
