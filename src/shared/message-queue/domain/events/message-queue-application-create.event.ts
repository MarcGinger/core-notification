/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { MessageQueueDomainEvent } from './message-queue-domain.event';

export class MessageQueueApplicationCreatedEvent extends MessageQueueDomainEvent {
  static readonly EVENT_TYPE = 'slack.message.created.v1';
  readonly eventType = MessageQueueApplicationCreatedEvent.EVENT_TYPE;
}
