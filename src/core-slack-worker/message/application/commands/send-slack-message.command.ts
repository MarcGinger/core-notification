/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ICommand } from '@nestjs/cqrs';

/**
 * Command to send a Slack message
 * Encapsulates all data needed for Slack message delivery
 */
export class SendSlackMessageCommand implements ICommand {
  constructor(
    public readonly messageId: string,
    public readonly tenant: string,
    public readonly channel: string,
    public readonly renderedMessage: string,
    public readonly correlationId: string,
    public readonly configCode: string,
    public readonly isRetry?: boolean,
    public readonly retryAttempt?: number,
    public readonly priority?: 'normal' | 'urgent' | 'critical',
  ) {}

  /**
   * Factory method to create command from use case data
   */
  static fromUseCaseData(data: {
    messageId: string;
    tenant: string;
    channel: string;
    renderedMessage: string;
    correlationId: string;
    configCode: string;
    isRetry?: boolean;
    retryAttempt?: number;
    priority?: 'normal' | 'urgent' | 'critical';
  }): SendSlackMessageCommand {
    return new SendSlackMessageCommand(
      data.messageId,
      data.tenant,
      data.channel,
      data.renderedMessage,
      data.correlationId,
      data.configCode,
      data.isRetry,
      data.retryAttempt,
      data.priority,
    );
  }

  /**
   * Convert command to use case data format
   */
  toUseCaseData() {
    return {
      messageId: this.messageId,
      tenant: this.tenant,
      channel: this.channel,
      renderedMessage: this.renderedMessage,
      correlationId: this.correlationId,
      configCode: this.configCode,
      isRetry: this.isRetry,
      retryAttempt: this.retryAttempt,
      priority: this.priority,
    };
  }
}
