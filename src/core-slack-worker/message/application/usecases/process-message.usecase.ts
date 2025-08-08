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
import { MessageDeliveryDomainService } from '../../domain/services/message-delivery-domain.service';
import { SlackApiAdapter } from '../../infrastructure/adapters/slack-api.adapter';

import { IUserToken } from 'src/shared/auth';
import {
  IMessage,
  Message,
  ProcessMessageProps,
  WorkerMessageResult,
} from '../../domain';
import { MessageRepository } from '../../infrastructure/repositories';
import { RenderMessageTemplateUseCase } from './render-message-template.usecase';

/**
 * Use case for sending a Slack message
 * Contains the core business logic for message delivery
 * Following DDD principles - uses aggregate for state changes and event emission
 */
@Injectable()
export class ProcessMessageUseCase {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly messageDeliveryDomainService: MessageDeliveryDomainService,
    private readonly slackApiAdapter: SlackApiAdapter,
    private readonly messageRepository: MessageRepository,
    private readonly renderMessageTemplateUseCase: RenderMessageTemplateUseCase,
  ) {}

  /**
   * Execute the use case to send a Slack message
   * This contains all the business logic for message delivery
   */
  async execute(
    user: IUserToken,
    data: ProcessMessageProps,
  ): Promise<WorkerMessageResult> {
    // Enhanced logging context for send operation start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'SendSlackMessageUseCase',
        'execute',
        data.id,
        user,
        {
          operation: 'SEND',
          entityType: 'slack-message',
          phase: 'START',
          hasUser: !!user,
          hasData: !!data,
          id: data?.id,
          tenant: user?.tenant,
          isRetry: data?.isRetry || false,
          retryAttempt: data?.retryAttempt || 0,
          priority: data?.priority || 'normal',
        },
      );

    this.logger.log(
      operationContext,
      `Starting Slack message delivery: id '${data.id}', tenant '${user.tenant}'`,
    );
    // Retrieve the message entity from repository
    const message = await this.messageRepository.getMessage(user, data.id);
    try {
      // Business rule: Validate channel format before attempting delivery
      // const channelValidation =
      //   this.slackDeliveryDomainService.validateChannelFormat(
      //     messageEntity.channel,
      //   );
      // if (!channelValidation.isValid) {
      //   return this.handlePermanentFailure(
      //     user,
      //     data,
      //     `Invalid channel format: ${channelValidation.reason}`,
      //     0,
      //   );
      // }

      // Render the message template
      const renderedMessage = await this.renderMessageTemplateUseCase.execute(
        user,
        message,
      );

      // Business logic: Load configuration (this would be implemented)
      const slackConfig = await this.loadSlackConfig(
        message.configCode,
        user.tenant || 'core',
      );

      // Technical concern: Send message via Slack API adapter
      const apiResult = await this.slackApiAdapter.sendMessage({
        channel: message.channel,
        text: renderedMessage,
        botToken: slackConfig.botToken,
      });

      if (apiResult.success) {
        // Handle successful delivery - update aggregate and let it emit events
        await this.handleSuccess(user, message);

        // Success logging with enhanced context
        const successContext =
          CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
            'SendSlackMessageUseCase',
            'execute',
            message.correlationId,
            user,
            {
              operation: 'SEND',
              entityType: 'slack-message',
              phase: 'SUCCESS',
              id: data.id,
              slackTimestamp: apiResult.timestamp,
              slackChannel: apiResult.channel,
              deliveryTime: new Date().toISOString(),
            },
          );

        this.logger.log(
          successContext,
          `Successfully delivered Slack message: id '${data.id}', slackTimestamp '${apiResult.timestamp}'`,
        );

        return {
          success: true,
          slackTimestamp: apiResult.timestamp,
          slackChannel: apiResult.channel,
        };
      } else {
        // Business logic: Classify the error and determine retry strategy
        const errorClassification =
          this.messageDeliveryDomainService.classifyMessageError(
            apiResult.error || 'unknown_error',
          );

        if (errorClassification === 'permanent') {
          return this.handlePermanentFailure(
            user,
            message,
            apiResult.error || 'Unknown error',
            data.retryAttempt || 0,
          );
        } else {
          return this.handleRetryableFailure(
            user,
            message,
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
          data.id,
          user,
          {
            operation: 'SEND',
            entityType: 'slack-message',
            phase: 'ERROR',
            id: data.id,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

      this.logger.error(
        errorContext,
        `Failed to execute send Slack message use case: id '${data.id}'`,
      );

      // For unexpected errors, treat as retryable
      return this.handleRetryableFailure(
        user,
        message,
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
    message: IMessage,
  ): Promise<void> {
    try {
      // Convert to aggregate using the domain factory method
      const aggregate = Message.fromEntity(message);

      // Mark message as successfully delivered - this will emit MessageDeliveredEvent
      aggregate.markAsDelivered(user);

      // If we have slack-specific data, we could store it in a metadata field
      // For now, we're keeping the domain clean and not storing Slack-specific details

      // Save the updated aggregate (will commit events to event store)
      await this.messageRepository.saveMessage(user, aggregate);
    } catch (error) {
      this.logger.warn(
        {
          id: message.id,
          correlationId: message.correlationId,
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
    message: IMessage,
    error: string,
    retryAttempt: number,
  ): Promise<WorkerMessageResult> {
    const userFriendlyMessage =
      this.messageDeliveryDomainService.generateUserFriendlyErrorMessage(
        error,
        message.channel,
      );

    // Error logging with enhanced context
    const errorContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SendSlackMessageUseCase',
      'handlePermanentFailure',
      message.correlationId,
      user,
      {
        operation: 'SEND',
        entityType: 'slack-message',
        phase: 'PERMANENT_FAILURE',
        id: message.id,
        error,
        retryAttempt,
        willRetry: false,
        errorType: 'permanent',
        userFriendlyMessage,
      },
    );

    this.logger.error(
      errorContext,
      `Slack message delivery permanently failed: id '${message.id}', will not retry`,
    );

    // Update aggregate with failure details - let aggregate emit events
    try {
      const aggregate = Message.fromEntity(message);

      // Mark message as failed - this will emit MessageDeliveryFailedEvent
      aggregate.markAsFailed(user, userFriendlyMessage);
      aggregate.updateRetryCount(user, retryAttempt);
      // Status change automatically updates _updatedAt

      // Save the updated aggregate
      await this.messageRepository.saveMessage(user, aggregate);
    } catch (aggregateError) {
      this.logger.warn(
        {
          id: message.id,
          correlationId: message.correlationId,
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
    message: IMessage,
    error: string,
    retryAttempt: number,
  ): WorkerMessageResult {
    const willRetry = this.messageDeliveryDomainService.shouldRetryMessage(
      retryAttempt,
      4, // Default max attempts
      message.priority,
    );

    // Error logging with enhanced context
    const errorContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      'SendSlackMessageUseCase',
      'handleRetryableFailure',
      message.correlationId,
      user,
      {
        operation: 'SEND',
        entityType: 'slack-message',
        phase: 'RETRYABLE_FAILURE',
        id: message.id,
        error,
        retryAttempt,
        willRetry,
        errorType: 'retryable',
      },
    );

    this.logger.error(
      errorContext,
      `Slack message delivery failed: id '${message.id}', retryable error, willRetry: ${willRetry}`,
    );

    // Update aggregate with failure details - let aggregate emit events
    // Note: We don't await this to avoid blocking the retry mechanism
    // If aggregate update fails, the retry logic still continues
    this.updateAggregateWithRetryableFailure(
      user,
      message,
      error,
      retryAttempt,
      willRetry,
    ).catch((aggregateError) => {
      this.logger.warn(
        {
          id: message.id,
          correlationId: message.correlationId,
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
    message: IMessage,
    error: string,
    retryAttempt: number,
    willRetry: boolean,
  ): Promise<void> {
    const aggregate = Message.fromEntity(message);

    // Handle retry or final failure with appropriate business method
    if (willRetry) {
      // Calculate next retry time (could be configurable)
      const nextRetryAt = new Date(Date.now() + 60000); // 1 minute from now
      aggregate.markForRetry(user, error, nextRetryAt);
    } else {
      aggregate.markAsFailed(user, error);
    }
    // Save the updated aggregate
    await this.messageRepository.saveMessage(user, aggregate);
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
