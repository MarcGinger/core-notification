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
import { IMessage } from '../entities';
import { MessageDomainEvent } from './message-domain.event';

/**
 * Event emitted when a message delivery has failed permanently or temporarily
 */
export class MessageDeliveryFailedEvent extends MessageDomainEvent {
  readonly eventType = 'message.delivery.failed.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: IMessage,
    public readonly failureReason: string,
    public readonly isRetryable: boolean,
    public readonly retryAttempt: number,
    public readonly previousStatus: string,
  ) {
    super(user, aggregateId, props);
  }
}
