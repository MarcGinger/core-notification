/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { IMessageRoutingStrategy, JobType, QueueRoute } from '../../types';

/**
 * Simple routing strategy with basic fallback behavior
 * Used for legacy compatibility - domains should handle their own routing
 * @deprecated Use domain-specific routing instead
 */
@Injectable()
export class DomainAwareRoutingStrategy implements IMessageRoutingStrategy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolve(jobType: JobType): QueueRoute {
    // Simple fallback for any remaining centralized routing needs
    return {
      queueName: 'default',
      options: { attempts: 3, priority: 1 },
    };
  }
}

/**
 * Registry for message routing strategies
 * Simplified for domain-driven architecture
 * @deprecated Domains should handle routing directly
 */
@Injectable()
export class MessageRoutingStrategyRegistry {
  private strategy: IMessageRoutingStrategy;

  constructor() {
    this.strategy = new DomainAwareRoutingStrategy();
  }

  setStrategy(strategy: IMessageRoutingStrategy): void {
    this.strategy = strategy;
  }

  resolve(jobType: JobType): QueueRoute {
    return this.strategy.resolve(jobType);
  }
}
