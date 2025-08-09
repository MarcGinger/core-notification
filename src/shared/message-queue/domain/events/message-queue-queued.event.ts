/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from 'src/shared/auth';
import { IMessageQueue } from '../entities';
import { MessageQueueDomainEvent } from './message-queue-domain.event';

/**
 * Event emitted when a message has been queued for delivery
 * This represents the transition from creation to queued state
 */
export class MessageQueueQueuedEvent extends MessageQueueDomainEvent {
  readonly eventType = 'message.queued.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: IMessageQueue,
    public readonly queuedAt: Date,
    public readonly jobId: string,
    public readonly priority: number,
    public readonly previousStatus: string,
  ) {
    super(user, aggregateId, props);
  }
}
