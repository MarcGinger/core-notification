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
 * Event emitted when a message delivery has failed permanently or temporarily
 */
export class MessageQueueDeliveryFailedEvent extends MessageQueueDomainEvent {
  readonly eventType = 'message.delivery.failed.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: IMessageQueue,
    public readonly failureReason: string,
    public readonly isRetryable: boolean,
    public readonly retryAttempt: number,
    public readonly previousStatus: string,
  ) {
    super(user, aggregateId, props);
  }
}
