/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export interface EventSubscriptionConfig {
  streamPattern: string;
  purpose: string;
  description: string;
}

export interface MessageQueueEventSubscriptionConfig {
  eventSubscriptions: EventSubscriptionConfig[];
}

export const MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG =
  'MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG';
