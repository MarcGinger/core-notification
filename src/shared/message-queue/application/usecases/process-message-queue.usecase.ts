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
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { IMessageQueue, MessageQueueDeliveryDomainService } from '../../domain';
import { MessageQueue } from '../../domain/aggregates';
import {
  ProcessMessageQueueProps,
  WorkerMessageQueueResult,
} from '../../domain/properties';
import { MessageQueueWorkerLoggingHelper } from '../../domain/value-objects';
import { MessageQueueApiAdapter } from '../../infrastructure/adapters';
import { MessageQueueRepository } from '../../infrastructure/repositories';

/**
 * Use case for sending a Slack message
 * Contains the core business logic for message delivery
 * Following DDD principles - uses aggregate for state changes and event emission
 */
@Injectable()
export class ProcessMessageQueueUseCase {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly deliveryDomainService: MessageQueueDeliveryDomainService,
    private readonly messageQueueApiAdapter: MessageQueueApiAdapter,
    private readonly messageRepository: MessageQueueRepository,
  ) {}

  /**
   * Execute the use case to send a MessageQueue message
   * This contains all the business logic for message delivery
   */
  async execute(
    user: IUserToken,
    data: ProcessMessageQueueProps,
  ): Promise<WorkerMessageQueueResult> {
    // Enhanced logging context for send operation start
    const operationContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'SendSlackMessageQueueUseCase',
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
    const message = await this.messageRepository.getMessageQueue(user, data.id);
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
      const renderedMessageQueue = 'TODO Some message rendering logic here'; // This would be replaced with actual template rendering logic
      // Business logic: Load configuration (this would be implemented)

      // Technical concern: Send message via MessageQueue API adapter
      const apiResult = await this.messageQueueApiAdapter.sendMessage({
        channel: '',
        text: renderedMessageQueue,
        botToken: '',
      });

      if (apiResult.success) {
        // Handle successful delivery - update aggregate and let it emit events
        await this.handleSuccess(user, message);

        // Success logging with enhanced context
        const successContext =
          MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
            'SendSlackMessageQueueUseCase',
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
        };
      } else {
        // Business logic: Classify the error and determine retry strategy
        const errorClassification =
          this.deliveryDomainService.classifyMessageQueueError(
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
      const errorMessageQueue =
        error instanceof Error ? error.message : 'Unknown error';

      // Error logging with enhanced context
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'SendSlackMessageQueueUseCase',
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
            errorMessageQueue,
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
        errorMessageQueue,
        data.retryAttempt || 0,
      );
    }
  }

  /**
   * Handle successful message delivery by updating the MessageQueue aggregate
   * The aggregate will emit proper domain events (MessageQueueUpdatedEvent)
   */
  private async handleSuccess(
    user: IUserToken,
    message: IMessageQueue,
  ): Promise<void> {
    try {
      // Convert to aggregate using the domain factory method
      const aggregate = MessageQueue.fromEntity(message);

      // Mark message as successfully delivered - this will emit MessageQueueDeliveredEvent
      aggregate.markAsDelivered(user);

      // If we have slack-specific data, we could store it in a metadata field
      // For now, we're keeping the domain clean and not storing Slack-specific details

      // Save the updated aggregate (will commit events to event store)
      await this.messageRepository.saveMessageQueue(user, aggregate);
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
   * Handle permanent failure (no retry) by updating the MessageQueue aggregate
   * The aggregate will emit proper domain events (MessageQueueUpdatedEvent)
   */
  private async handlePermanentFailure(
    user: IUserToken,
    message: IMessageQueue,
    error: string,
    retryAttempt: number,
  ): Promise<WorkerMessageQueueResult> {
    const userFriendlyMessage =
      this.deliveryDomainService.generateUserFriendlyErrorMessageQueue(
        error,
        'channel',
      );

    // Error logging with enhanced context
    const errorContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'SendSlackMessageQueueUseCase',
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
      const aggregate = MessageQueue.fromEntity(message);

      // Mark message as failed - this will emit MessageQueueDeliveryFailedEvent
      aggregate.markAsFailed(user, userFriendlyMessage);
      aggregate.updateRetryCount(user, retryAttempt);
      // Status change automatically updates _updatedAt

      // Save the updated aggregate
      await this.messageRepository.saveMessageQueue(user, aggregate);
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
   * Handle retryable failure by updating the MessageQueue aggregate
   * The aggregate will emit proper domain events (MessageQueueUpdatedEvent)
   */
  private handleRetryableFailure(
    user: IUserToken,
    message: IMessageQueue,
    error: string,
    retryAttempt: number,
  ): WorkerMessageQueueResult {
    const willRetry = this.deliveryDomainService.shouldRetryMessageQueue(
      retryAttempt,
      4, // Default max attempts
      message.priority,
    );

    // Error logging with enhanced context
    const errorContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'SendSlackMessageQueueUseCase',
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
    message: IMessageQueue,
    error: string,
    retryAttempt: number,
    willRetry: boolean,
  ): Promise<void> {
    const aggregate = MessageQueue.fromEntity(message);

    // Handle retry or final failure with appropriate business method
    if (willRetry) {
      // Calculate next retry time (could be configurable)
      const nextRetryAt = new Date(Date.now() + 60000); // 1 minute from now
      aggregate.markForRetry(user, error, nextRetryAt);
    } else {
      aggregate.markAsFailed(user, error);
    }
    // Save the updated aggregate
    await this.messageRepository.saveMessageQueue(user, aggregate);
  }
}
