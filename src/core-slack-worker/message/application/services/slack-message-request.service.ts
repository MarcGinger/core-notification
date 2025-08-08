/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { v4 as uuidv4 } from 'uuid';
import { CreateMessageProps } from '../../domain/properties';
import { CreateMessageCommand } from '../commands/create/create-message.command';

/**
 * Service for handling Slack message requests from external services
 * This acts as the entry point for the event-driven workflow:
 *
 * Flow:
 * 1. SlackMessageRequestService creates CreateMessageCommand
 * 2. CreateMessageCommand → CreateMessageHandler → CreateMessageUseCase
 * 3. Message aggregate emits MessageCreatedEvent to EventStore
 * 4. SendSlackMessageEventHandler picks up the event
 * 5. Event handler creates CreateSendSlackMessageCommand for Slack delivery
 */
@Injectable()
export class SlackMessageRequestService {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Request a Slack message to be sent
   * This method sends a SendSlackMessageCommand which triggers the workflow
   */
  async requestSlackMessage(
    user: IUserToken,
    request: CreateMessageProps,
  ): Promise<string> {
    const correlationId = request.correlationId || uuidv4();
    const tenant = user.tenant || user.tenant_id || 'default';

    const logContext = {
      correlationId,
      tenant,
      channel: request.channel,
      configCode: request.configCode,
      templateCode: request.templateCode,
      scheduledAt: request.scheduledAt,
      userId: user.sub,
    };

    try {
      this.logger.log(
        logContext,
        'Processing Slack message request from external service',
      );

      // Validate required fields
      this.validateRequest(request);
      this.validateUser(user);

      // Create command to persist message to EventStore
      // This will emit MessageCreatedEvent which triggers Slack delivery
      const command = new CreateMessageCommand(user, {
        configCode: request.configCode,
        channel: request.channel,
        templateCode: request.templateCode,
        payload: request.payload,
        scheduledAt: request.scheduledAt,
      });

      // Execute the command - this creates the message and emits events
      await this.commandBus.execute(command);

      this.logger.log(
        { ...logContext, commandExecuted: true },
        'CreateMessageCommand executed successfully - message persisted to EventStore, Slack delivery will be triggered by event handler',
      );

      return correlationId;
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to process Slack message request',
      );
      throw error;
    }
  }

  /**
   * Bulk request multiple Slack messages
   */
  async requestBulkSlackMessages(
    user: IUserToken,
    requests: CreateMessageProps[],
  ): Promise<string[]> {
    const correlationIds: string[] = [];

    this.logger.log(
      { totalRequests: requests.length, userId: user.sub },
      'Processing bulk Slack message requests',
    );

    try {
      for (const request of requests) {
        const correlationId = await this.requestSlackMessage(user, request);
        correlationIds.push(correlationId);
      }

      this.logger.log(
        {
          totalRequests: requests.length,
          successfulRequests: correlationIds.length,
          userId: user.sub,
        },
        'Bulk Slack message requests processed successfully',
      );

      return correlationIds;
    } catch (error) {
      this.logger.error(
        {
          totalRequests: requests.length,
          processedRequests: correlationIds.length,
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.sub,
        },
        'Failed to process bulk Slack message requests',
      );
      throw error;
    }
  }

  /**
   * Schedule a Slack message for future delivery
   */
  async scheduleSlackMessage(
    user: IUserToken,
    request: Omit<CreateMessageProps, 'scheduledAt'>,
    scheduledAt: Date,
  ): Promise<string> {
    const now = new Date();
    if (scheduledAt <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    return this.requestSlackMessage(user, {
      ...request,
      scheduledAt,
    });
  }

  /**
   * Request an immediate high-priority Slack message
   */
  async requestUrgentSlackMessage(
    user: IUserToken,
    request: Omit<CreateMessageProps, 'priority'>,
  ): Promise<string> {
    return this.requestSlackMessage(user, {
      ...request,
      priority: 20, // CRITICAL priority
    });
  }

  /**
   * Validate the Slack message request
   */
  private validateRequest(request: CreateMessageProps): void {
    if (!request.channel) {
      throw new Error('Channel is required');
    }

    if (!request.configCode) {
      throw new Error('Config code is required');
    }

    // Validate channel format (basic validation)
    if (!request.channel.startsWith('#') && !request.channel.startsWith('@')) {
      throw new Error(
        'Channel must start with # for channels or @ for direct messages',
      );
    }

    // Validate scheduled time is in the future
    if (request.scheduledAt && request.scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Validate priority range
    if (request.priority !== undefined) {
      if (request.priority < 1 || request.priority > 20) {
        throw new Error('Priority must be between 1 and 20');
      }
    }
  }

  /**
   * Validate the user token for tenant extraction
   */
  private validateUser(user: IUserToken): void {
    if (!user) {
      throw new Error('User token is required');
    }

    if (!user.sub) {
      throw new Error('User ID (sub) is required in token');
    }

    // Ensure we can extract tenant information
    if (!user.tenant && !user.tenant_id) {
      throw new Error('Tenant information is required in user token');
    }
  }
}
