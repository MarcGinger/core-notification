/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ILogger } from 'src/shared/logger';
import {
  MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG,
  MessageQueueEventSubscriptionConfig,
} from '../../domain/interfaces';
import { IMessageProcessingAdapter } from '../adapters';

/**
 * Dynamic registry service for message processing adapters
 * Routes messages to domain-specific adapters when configured
 */
@Injectable()
export class MessageProcessingAdapterRegistry {
  private readonly adapters: Map<string, IMessageProcessingAdapter> = new Map();

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly moduleRef: ModuleRef,
    @Inject(MESSAGE_QUEUE_EVENT_SUBSCRIPTION_CONFIG)
    @Optional()
    private readonly config?: MessageQueueEventSubscriptionConfig,
  ) {
    void this.initializeAdapters(); // Fire and forget initialization
  }

  private async initializeAdapters(): Promise<void> {
    // Register domain-specific adapter if configured
    if (this.config?.messageQueueAdapter) {
      try {
        const domainAdapter: unknown = await this.moduleRef.get(
          this.config.messageQueueAdapter,
          { strict: false },
        );

        // Type guard to check if it's a valid adapter
        if (this.isValidAdapter(domainAdapter)) {
          this.adapters.set(this.config.messageQueueAdapter, domainAdapter);
          this.logger.log(
            {
              adapterName: this.config.messageQueueAdapter,
              domain: this.config.domain,
            },
            'Registered domain-specific message adapter',
          );
        }
      } catch (error) {
        this.logger.warn(
          {
            adapterName: this.config.messageQueueAdapter,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to resolve domain-specific adapter',
        );
      }
    }
  }

  /**
   * Type guard to check if an object is a valid message processing adapter
   */
  private isValidAdapter(obj: unknown): obj is IMessageProcessingAdapter {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const candidate = obj as Record<string, unknown>;
    return (
      'processMessage' in candidate &&
      'canHandle' in candidate &&
      typeof candidate.processMessage === 'function' &&
      typeof candidate.canHandle === 'function'
    );
  }

  /**
   * Get the appropriate adapter for the given config code
   * Prioritizes domain-specific adapters over defaults
   * Returns null if no adapter can handle the config code
   */
  getAdapter(configCode: string): IMessageProcessingAdapter | null {
    this.logger.debug(
      {
        configCode,
        availableAdapters: Array.from(this.adapters.keys()),
        domainAdapter: this.config?.messageQueueAdapter,
      },
      'Looking for adapter to handle configCode',
    );

    // If we have a domain-specific adapter configured, try it first
    if (this.config?.messageQueueAdapter) {
      const domainAdapter = this.adapters.get(this.config.messageQueueAdapter);
      if (domainAdapter?.canHandle(configCode)) {
        this.logger.debug(
          {
            configCode,
            selectedAdapter: this.config.messageQueueAdapter,
            domain: this.config.domain,
          },
          'Using domain-specific adapter',
        );
        return domainAdapter;
      }
    }

    // Fall back to checking all available adapters
    for (const [name, adapter] of this.adapters.entries()) {
      if (adapter.canHandle(configCode)) {
        this.logger.debug(
          {
            configCode,
            selectedAdapter: name,
          },
          'Found compatible adapter',
        );
        return adapter;
      }
    }

    // No adapter found
    this.logger.warn(
      {
        configCode,
        registeredAdapters: Array.from(this.adapters.keys()),
      },
      'No adapter found for configCode',
    );

    return null;
  }

  /**
   * Register a new adapter dynamically
   */
  registerAdapter(name: string, adapter: IMessageProcessingAdapter): void {
    this.adapters.set(name, adapter);
    this.logger.log(
      { adapterName: name },
      'Dynamically registered message adapter',
    );
  }

  /**
   * List all registered adapters
   */
  listAdapters(): Array<{
    name: string;
    isDomainSpecific: boolean;
  }> {
    return Array.from(this.adapters.keys()).map((name) => ({
      name,
      isDomainSpecific: name === this.config?.messageQueueAdapter,
    }));
  }

  /**
   * Get the configured domain information
   */
  getDomainInfo(): { domain?: string; adapter?: string } {
    return {
      domain: this.config?.domain,
      adapter: this.config?.messageQueueAdapter,
    };
  }
}
