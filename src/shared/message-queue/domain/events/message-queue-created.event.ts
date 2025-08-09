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
 * Event emitted when a message is successfully created in the system
 */
export class MessageQueueCreatedEvent extends MessageQueueDomainEvent {
  readonly eventType = 'message.created.v1';

  constructor(user: IUserToken, aggregateId: string, props: IMessageQueue) {
    super(user, aggregateId, props);
  }
}
