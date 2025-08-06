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
 * Event emitted when a message has been successfully delivered to Slack
 * This represents the completion of the delivery process
 */
export class MessageDeliveredEvent extends MessageDomainEvent {
  readonly eventType = 'message.delivered.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: IMessage,
    public readonly deliveredAt: Date,
    public readonly previousStatus: string,
  ) {
    super(user, aggregateId, props);
  }
}
