/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IEvent } from '@nestjs/cqrs';

/**
 * Event triggered when an external service requests a Slack message to be sent
 */
export class SlackMessageRequestedEvent implements IEvent {
  constructor(
    public readonly correlationId: string,
    public readonly tenant: string,
    public readonly channel: string,
    public readonly configCode: string,
    public readonly templateCode?: string,
    public readonly payload?: Record<string, any>,
    public readonly scheduledAt?: Date,
    public readonly priority?: number,
  ) {}
}

/**
 * Internal event after message validation and queuing
 */
export class SlackMessageQueuedEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly correlationId: string,
    public readonly tenant: string,
    public readonly channel: string,
    public readonly configCode: string,
    public readonly templateCode?: string,
    public readonly renderedMessage?: string,
    public readonly queuedAt: Date = new Date(),
    public readonly jobId?: string,
  ) {}
}

/**
 * Event when message is successfully sent to Slack
 */
export class SlackMessageSentEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly correlationId: string,
    public readonly tenant: string,
    public readonly channel: string,
    public readonly sentAt: Date = new Date(),
    public readonly slackTimestamp?: string,
    public readonly slackChannel?: string,
  ) {}
}

/**
 * Event when message delivery fails
 */
export class SlackMessageFailedEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly correlationId: string,
    public readonly tenant: string,
    public readonly channel: string,
    public readonly failedAt: Date = new Date(),
    public readonly failureReason: string,
    public readonly retryCount: number,
    public readonly willRetry: boolean,
    public readonly error?: any,
  ) {}
}

/**
 * Event when message retry is triggered
 */
export class SlackMessageRetriedEvent implements IEvent {
  constructor(
    public readonly messageId: string,
    public readonly correlationId: string,
    public readonly tenant: string,
    public readonly channel: string,
    public readonly retriedAt: Date = new Date(),
    public readonly retryAttempt: number,
    public readonly newJobId?: string,
    public readonly delayMs?: number,
  ) {}
}
