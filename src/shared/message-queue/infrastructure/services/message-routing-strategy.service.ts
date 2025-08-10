/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IMessageRoutingStrategy, JobType, QueueRoute } from '../../types';
import { 
  MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG,
  MessageQueueEventSubscriptionConfig 
} from '../../domain/interfaces';

/**
 * Default routing strategy that maps job types to appropriate queues
 * Provides fallback routes when domain-specific configs don't specify routes
 */
@Injectable()
export class DefaultMessageRoutingStrategy implements IMessageRoutingStrategy {
  private readonly routeMap: Record<string, QueueRoute> = {
    // Default notification routes
    'notification.send': {
      queueName: 'notifications',
      options: { attempts: 3, priority: 5 },
    },
    
    // Default transaction routes
    'transaction.settle': {
      queueName: 'transactions',
      options: { attempts: 5, priority: 10 },
    },
    'transaction.refund': {
      queueName: 'transactions',
      options: { attempts: 3, priority: 8 },
    },
    'transaction.validate': {
      queueName: 'transactions',
      options: { attempts: 2, priority: 7 },
    },
    
    // Default slack routes
    'slack.message.send': {
      queueName: 'slack-messages',
      options: { attempts: 3, priority: 3 },
    },
  };

  resolve(jobType: JobType): QueueRoute {
    const route = this.routeMap[jobType];
    if (!route) {
      // Default fallback
      return {
        queueName: 'default',
        options: { attempts: 3, priority: 1 },
      };
    }
    return route;
  }
}

/**
 * Domain-aware routing strategy that uses domain-specific route maps
 * Falls back to default strategy when domain routes are not available
 */
@Injectable()
export class DomainAwareRoutingStrategy implements IMessageRoutingStrategy {
  private readonly domainRouteMap: Record<string, QueueRoute>;
  private readonly defaultStrategy: DefaultMessageRoutingStrategy;

  constructor(
    @Inject(MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG)
    @Optional()
    private readonly config?: MessageQueueEventSubscriptionConfig,
  ) {
    this.domainRouteMap = config?.routeMap || {};
    this.defaultStrategy = new DefaultMessageRoutingStrategy();
  }

  resolve(jobType: JobType): QueueRoute {
    // First check domain-specific routes
    const domainRoute = this.domainRouteMap[jobType];
    if (domainRoute) {
      return domainRoute;
    }

    // Fall back to default strategy
    return this.defaultStrategy.resolve(jobType);
  }
}

/**
 * Registry for message routing strategies
 * Supports both default and domain-aware routing
 */
@Injectable()
export class MessageRoutingStrategyRegistry {
  private strategy: IMessageRoutingStrategy;

  constructor(
    @Inject(MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG)
    @Optional()
    private readonly config?: MessageQueueEventSubscriptionConfig,
  ) {
    // Use domain-aware strategy if configuration is provided, otherwise default
    this.strategy = config 
      ? new DomainAwareRoutingStrategy(config)
      : new DefaultMessageRoutingStrategy();
  }

  setStrategy(strategy: IMessageRoutingStrategy): void {
    this.strategy = strategy;
  }

  resolve(jobType: JobType): QueueRoute {
    return this.strategy.resolve(jobType);
  }

  /**
   * Get the configured domain adapter name if available
   */
  getDomainAdapter(): string | undefined {
    return this.config?.messageQueueAdapter;
  }

  /**
   * Get the domain identifier if configured
   */
  getDomain(): string | undefined {
    return this.config?.domain;
  }
}