/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Type } from '@nestjs/common';
import { QueueRoute } from '../../types';

export interface EventSubscriptionConfig {
  streamPattern: string;
  purpose: string;
  description: string;
}

/**
 * Generic configuration for message queue event subscriptions
 * Allows each domain to configure its own routing and adapters
 */
export interface MessageQueueEventSubscriptionConfig {
  eventSubscriptions: EventSubscriptionConfig[];
  customStrategies?: Type<any>[];

  /**
   * Domain-specific message queue adapter name
   * Allows each domain to specify which adapter to use for message processing
   * E.g., 'TransactionMessageAdapter', 'SlackMessageAdapter', etc.
   */
  messageQueueAdapter?: string;

  /**
   * Domain-specific route configuration
   * Maps job types to queue names and options for this domain
   * Overrides default routing for domain-specific requirements
   */
  routeMap?: Record<string, QueueRoute>;

  /**
   * Optional domain identifier for scoping configuration
   */
  domain?: string;
}

export const MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG =
  'MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG';
