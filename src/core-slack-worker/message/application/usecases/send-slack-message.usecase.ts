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
import { ILogger } from 'src/shared/logger';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import { SlackDeliveryDomainService } from '../../domain/services/slack-delivery-domain.service';
import { SlackApiAdapter } from '../../infrastructure/adapters/slack-api.adapter';

import { IUserToken } from 'src/shared/auth';
import { Message } from '../../domain';
import { MessageRepository } from '../../infrastructure/repositories';

/**
 * Data required to send a Slack message
 */
export interface SendSlackMessageData {
  messageId: string;
  tenant: string;
  channel: string;
  renderedMessage: string;
  correlationId: string;
  configCode: string;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'normal' | 'urgent' | 'critical';
}

/**
 * Result of sending a Slack message
 */
export interface SlackMessageResult {
  success: boolean;
  slackTimestamp?: string;
  slackChannel?: string;
  error?: string;
  isRetryable?: boolean;
  userFriendlyMessage?: string;
}

/**
 * Use case for sending a Slack message
 * Contains the core business logic for message delivery
 * Following DDD principles - uses aggregate for state changes and event emission
 */
@Injectable()
export class SendSlackMessageUseCase {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly slackDeliveryDomainService: SlackDeliveryDomainService,
    private readonly slackApiAdapter: SlackApiAdapter,
    private readonly messageRepository: MessageRepository,
  ) {}

  /**
   * Execute the use case to send a Slack message
   * This contains all the business logic for message delivery
   */
  async execute(
    user: IUserToken,
    data: SendSlackMessageData,
  ): Promise<SlackMessageResult> {
    // Enhanced logging context for send operation start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'SendSlackMessageUseCase',
        'execute',
        data.correlationId,
        user,
        {
          operation: 'SEND',
          entityType: 'slack-message',
          phase: 'START',
          hasUser: !!user,
          hasData: !!data,
          messageId: data?.messageId,
          tenant: data?.tenant,
          channel: data?.channel,
          configCode: data?.configCode,
          isRetry: data?.isRetry || false,
          retryAttempt: data?.retryAttempt || 0,
          priority: data?.priority || 'normal',
          hasRenderedMessage: !!data?.renderedMessage,
        },
      );

    this.logger.log(
      operationContext,
      `Starting Slack message delivery: messageId '${data.messageId}', correlationId '${data.correlationId}'`,
    );

    try {
      // Business rule: Validate channel format before attempting delivery
      const channelValidation =
        this.slackDeliveryDomainService.validateChannelFormat(data.channel);
      if (!channelValidation.isValid) {
        return this.handlePermanentFailure(
          user,
          data,
          `Invalid channel format: ${channelValidation.reason}`,
          0,
        );
      }

      // Business logic: Load configuration (this would be implemented)
      const slackConfig = await this.loadSlackConfig(
        data.configCode,
        data.tenant,
      );

      // Technical concern: Send message via Slack API adapter
      const apiResult = await this.slackApiAdapter.sendMessage({
        channel: data.channel,
        text: data.renderedMessage,
        botToken: slackConfig.botToken,
      });

      if (apiResult.success) {
        // Handle successful delivery - update aggregate and let it emit events
        await this.handleSuccess(user, data, apiResult);

        // Success logging with enhanced context
        const successContext =
          CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
            'SendSlackMessageUseCase',
            'execute',
            data.correlationId,
            user,
            {
              operation: 'SEND',
              entityType: 'slack-message',
              phase: 'SUCCESS',
              messageId: data.messageId,
              slackTimestamp: apiResult.timestamp,
              slackChannel: apiResult.channel,
              deliveryTime: new Date().toISOString(),
            },
          );

        this.logger.log(
          successContext,
          `Successfully delivered Slack message: messageId '${data.messageId}', slackTimestamp '${apiResult.timestamp}'`,
        );

        return {
          success: true,
          slackTimestamp: apiResult.timestamp,
          slackChannel: apiResult.channel,
        };
      } else {
        // Business logic: Classify the error and determine retry strategy
        const errorClassification =
          this.slackDeliveryDomainService.classifySlackError(
            apiResult.error || 'unknown_error',
          );

        if (errorClassification === 'permanent') {
          return this.handlePermanentFailure(
            user,
            data,
            apiResult.error || 'Unknown error',
            data.retryAttempt || 0,
          );
        } else {
          return this.handleRetryableFailure(
            user,
            data,
            apiResult.error || 'Unknown error',
            data.retryAttempt || 0,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Error logging with enhanced context
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SendSlackMessageUseCase',
          'execute',
          data.correlationId,
          user,
          {
            operation: 'SEND',
            entityType: 'slack-message',
            phase: 'ERROR',
            messageId: data.messageId,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

      this.logger.error(
        errorContext,
        `Failed to execute send Slack message use case: messageId '${data.messageId}'`,
      );

      // For unexpected errors, treat as retryable
      return this.handleRetryableFailure(
        user,
        data,
        errorMessage,
        data.retryAttempt || 0,
      );
    }
  }

  /**
   * Handle successful message delivery by updating the Message aggregate
   * The aggregate will emit proper domain events (MessageUpdatedEvent)
   */
  private async handleSuccess(
    user: IUserToken,
    data: SendSlackMessageData,
    apiResult: { timestamp?: string; channel?: string },
  ): Promise<void> {
    try {
      // Retrieve the message entity from repository
      const messageEntity = await this.messageRepository.getMessage(
        user,
        data.messageId,
      );

      // Convert to aggregate using the domain factory method
      const aggregate = Message.fromEntity(messageEntity);

      // Mark message as successfully delivered - this will emit MessageDeliveredEvent
      aggregate.markAsDelivered(user);

      // If we have slack-specific data, we could store it in a metadata field
      // For now, we're keeping the domain clean and not storing Slack-specific details

      // Save the updated aggregate (will commit events to event store)
      await this.messageRepository.saveMessage(user, aggregate);
    } catch (error) {
      this.logger.warn(
        {
          messageId: data.messageId,
          correlationId: data.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to update message aggregate after successful delivery - message was sent but state may be inconsistent',
      );
      // Don't throw - the Slack message was sent successfully
    }
  }

  /**
   * Handle permanent failure (no retry) by updating the Message aggregate
   * The aggregate will emit proper domain events (MessageUpdatedEvent)
   */
  private async handlePermanentFailure(
    user: IUserToken,
    data: SendSlackMessageData,
    error: string,
    retryAttempt: number,
  ): Promise<SlackMessageResult> {
    const userFriendlyMessage =
      this.slackDeliveryDomainService.generateUserFriendlyErrorMessage(
        error,
        data.channel,
      );

    // Error logging with enhanced context
    const errorContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SendSlackMessageUseCase',
      'handlePermanentFailure',
      data.correlationId,
      user,
      {
        operation: 'SEND',
        entityType: 'slack-message',
        phase: 'PERMANENT_FAILURE',
        messageId: data.messageId,
        error,
        retryAttempt,
        willRetry: false,
        errorType: 'permanent',
        userFriendlyMessage,
      },
    );

    this.logger.error(
      errorContext,
      `Slack message delivery permanently failed: messageId '${data.messageId}', will not retry`,
    );

    // Update aggregate with failure details - let aggregate emit events
    try {
      const messageEntity = await this.messageRepository.getMessage(
        user,
        data.messageId,
      );
      const aggregate = Message.fromEntity(messageEntity);

      // Mark message as failed - this will emit MessageDeliveryFailedEvent
      aggregate.markAsFailed(user, userFriendlyMessage);
      aggregate.updateRetryCount(user, retryAttempt);
      // Status change automatically updates _updatedAt

      // Save the updated aggregate
      await this.messageRepository.saveMessage(user, aggregate);
    } catch (aggregateError) {
      this.logger.warn(
        {
          messageId: data.messageId,
          correlationId: data.correlationId,
          error:
            aggregateError instanceof Error
              ? aggregateError.message
              : 'Unknown error',
        },
        'Failed to update message aggregate after permanent failure',
      );
      // Continue - we still want to return the error result
    }

    return {
      success: false,
      error,
      isRetryable: false,
      userFriendlyMessage,
    };
  }

  /**
   * Handle retryable failure by updating the Message aggregate
   * The aggregate will emit proper domain events (MessageUpdatedEvent)
   */
  private handleRetryableFailure(
    user: IUserToken,
    data: SendSlackMessageData,
    error: string,
    retryAttempt: number,
  ): SlackMessageResult {
    const willRetry = this.slackDeliveryDomainService.shouldRetryMessage(
      retryAttempt,
      4, // Default max attempts
      data.priority || 'normal',
    );

    // Error logging with enhanced context
    const errorContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SendSlackMessageUseCase',
      'handleRetryableFailure',
      data.correlationId,
      user,
      {
        operation: 'SEND',
        entityType: 'slack-message',
        phase: 'RETRYABLE_FAILURE',
        messageId: data.messageId,
        error,
        retryAttempt,
        willRetry,
        errorType: 'retryable',
      },
    );

    this.logger.error(
      errorContext,
      `Slack message delivery failed: messageId '${data.messageId}', retryable error, willRetry: ${willRetry}`,
    );

    // Update aggregate with failure details - let aggregate emit events
    // Note: We don't await this to avoid blocking the retry mechanism
    // If aggregate update fails, the retry logic still continues
    this.updateAggregateWithRetryableFailure(
      user,
      data,
      error,
      retryAttempt,
      willRetry,
    ).catch((aggregateError) => {
      this.logger.warn(
        {
          messageId: data.messageId,
          correlationId: data.correlationId,
          error:
            aggregateError instanceof Error
              ? aggregateError.message
              : 'Unknown error',
        },
        'Failed to update message aggregate after retryable failure',
      );
    });

    return {
      success: false,
      error,
      isRetryable: true,
    };
  }

  /**
   * Helper method to update aggregate after retryable failure
   */
  private async updateAggregateWithRetryableFailure(
    user: IUserToken,
    data: SendSlackMessageData,
    error: string,
    retryAttempt: number,
    willRetry: boolean,
  ): Promise<void> {
    try {
      const messageEntity = await this.messageRepository.getMessage(
        user,
        data.messageId,
      );
      const aggregate = Message.fromEntity(messageEntity);

      // Handle retry or final failure with appropriate business method
      if (willRetry) {
        // Calculate next retry time (could be configurable)
        const nextRetryAt = new Date(Date.now() + 60000); // 1 minute from now
        aggregate.markForRetry(user, error, nextRetryAt);
      } else {
        aggregate.markAsFailed(user, error);
      }
      // Status change automatically updates _updatedAt

      // Save the updated aggregate
      await this.messageRepository.saveMessage(user, aggregate);
    } catch (error) {
      // Re-throw to be caught by the caller
      throw error;
    }
  }

  /**
   * Load Slack configuration for the given tenant and config code
   * This encapsulates the business logic for configuration loading
   */
  private loadSlackConfig(
    configCode: string,
    tenant: string,
  ): Promise<{ botToken: string; configCode: string }> {
    // TODO: Implement actual config loading from config service
    // This should load Slack bot token, workspace settings, etc.
    // For now, return a mock config
    return Promise.resolve({
      botToken: process.env.SLACK_BOT_TOKEN || `xoxb-${tenant}-bot-token`,
      configCode,
    });
  }
}
