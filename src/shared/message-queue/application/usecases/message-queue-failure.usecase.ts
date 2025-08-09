/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IUserToken } from 'src/shared/auth';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { MessageQueue } from '../../domain/aggregates';
import { WorkerMessageQueueProps } from '../../domain/properties';
import { MessageQueueWorkerLoggingHelper } from '../../domain/value-objects';
import { MessageQueueRepository } from '../../infrastructure/repositories';
/**
 * Use case for handling Slack message delivery failures.
 * Manages retry logic and final failure states.
 *
 * This implementation showcases:
 * - Proper separation of concerns for failure handling
 * - Event-driven architecture with retry event emission
 * - Business logic for retry strategies
 * - Comprehensive error handling and audit logging
 */
@Injectable()
export class MessageQueueFailureUseCase {
  private readonly logger = new Logger(MessageQueueFailureUseCase.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
    private readonly messageRepository: MessageQueueRepository,
  ) {}

  /**
   * Handles Slack message delivery failure
   * @param user - The user context (system user for automated failures)
   * @param props - The failure properties
   * @returns Promise<void>
   */
  async execute(
    user: IUserToken,
    props: WorkerMessageQueueProps,
  ): Promise<void> {
    // Enhanced logging context for failure handling start
    const operationContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'MessageQueueFailureUseCase',
        'execute',
        `${user.tenant}-${props.messageId}`,
        undefined, // No user context in failure handling
        {
          operation: 'HANDLE_FAILURE',
          entityType: 'slack-message',
          phase: 'START',
          messageId: props.messageId,
          correlationId: props.correlationId,
          tenant: user.tenant,
          failureReason: props.failureReason,
          retryCount: props.retryCount,
          willRetry: props.willRetry,
          failureType: props.willRetry ? 'retryable' : 'permanent',
        },
      );

    this.logger.warn(
      operationContext,
      `Processing Slack message delivery failure: messageId '${props.messageId}', reason '${props.failureReason}', willRetry: ${props.willRetry}`,
    );

    try {
      // Load message aggregate from repository
      const messageEntity = await this.messageRepository.getMessageQueue(
        user,
        props.messageId,
      );
      const message = MessageQueue.fromEntity(messageEntity);

      // Use domain methods to handle the failure
      if (props.willRetry) {
        // Mark for retry with incremented count and failure reason
        const nextRetryAt = new Date(
          Date.now() + Math.min(Math.pow(2, props.retryCount) * 1000, 60000),
        );
        message.markForRetry(user, props.failureReason, nextRetryAt);
      } else {
        // Mark as permanently failed
        message.markAsFailed(user, props.failureReason);
      }

      // Update retry count if different
      if (message.retryCount !== props.retryCount) {
        message.updateRetryCount(user, props.retryCount);
      }

      // Save the aggregate (this will persist domain events)
      await this.messageRepository.saveMessageQueue(user, message);

      // Handle retry logic
      if (props.willRetry) {
        await this.scheduleRetry(user, props);
      }

      // Success logging with enhanced context
      const successContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueFailureUseCase',
          'execute',
          `${user.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'HANDLE_FAILURE',
            entityType: 'slack-message',
            phase: 'SUCCESS',
            messageId: props.messageId,
            correlationId: props.correlationId,
            failureType: props.willRetry ? 'retryable' : 'permanent',
            action: props.willRetry ? 'retry_scheduled' : 'marked_as_failed',
            retryCount: props.retryCount,
            finalStatus: props.willRetry ? 'pending_retry' : 'failed',
          },
        );

      this.logger.log(
        successContext,
        `Successfully processed Slack message failure: messageId '${props.messageId}' - ${
          props.willRetry ? 'retry scheduled' : 'marked as failed'
        }`,
      );
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueFailureUseCase',
          'execute',
          `${user.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'HANDLE_FAILURE',
            entityType: 'slack-message',
            phase: 'ERROR',
            messageId: props.messageId,
            correlationId: props.correlationId,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessageQueue:
              error instanceof Error ? error.message : 'Unknown error',
            originalFailureReason: props.failureReason,
            retryCount: props.retryCount,
            willRetry: props.willRetry,
          },
        );

      this.logger.error(
        errorContext,
        `Failed to process Slack message failure: messageId '${props.messageId}', originalFailure '${props.failureReason}'`,
      );
      throw error;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    user: IUserToken,
    props: WorkerMessageQueueProps,
  ): Promise<void> {
    const retryDelay = Math.min(Math.pow(2, props.retryCount) * 1000, 60000); // Max 1 minute
    const nextRetryAttempt = props.retryCount + 1;

    // Enhanced logging context for retry scheduling start
    const operationContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'MessageQueueFailureUseCase',
        'scheduleRetry',
        `${user.tenant}-${props.messageId}`,
        undefined,
        {
          operation: 'SCHEDULE_RETRY',
          entityType: 'slack-message',
          phase: 'START',
          messageId: props.messageId,
          correlationId: props.correlationId,
          tenant: user.tenant,
          retryCount: props.retryCount,
          nextRetryAttempt,
          retryDelayMs: retryDelay,
          originalFailureReason: props.failureReason,
        },
      );

    this.logger.log(
      operationContext,
      `Scheduling retry for failed Slack message: messageId '${props.messageId}', attempt ${nextRetryAttempt}, delay ${retryDelay}ms`,
    );

    try {
      const retryJob = await this.slackQueue.add(
        'deliver-slack-message',
        {
          messageId: props.messageId,
          tenant: user.tenant,
          correlationId: props.correlationId,
          isRetry: true,
          retryAttempt: nextRetryAttempt,
        },
        {
          delay: retryDelay,
          attempts: 1, // Single attempt for retries
          priority: QUEUE_PRIORITIES.NORMAL,
          removeOnComplete: 50,
          removeOnFail: 25,
        },
      );

      // Domain events are automatically published when the aggregate is saved
      // MessageQueueDeliveryFailedEvent or MessageQueueRetryingEvent will be emitted based on willRetry flag
      const eventLogContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueFailureUseCase',
          'scheduleRetry',
          `${user.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'SCHEDULE_RETRY',
            entityType: 'slack-message',
            phase: 'EVENT_CREATED',
            messageId: props.messageId,
            correlationId: props.correlationId,
            eventType: props.willRetry
              ? 'MessageQueueRetryingEvent'
              : 'MessageQueueDeliveryFailedEvent',
            retryJobId: retryJob.id?.toString(),
            nextRetryAttempt,
            retryDelayMs: retryDelay,
            eventTimestamp: new Date().toISOString(),
          },
        );

      this.logger.log(
        eventLogContext,
        `Domain event ${props.willRetry ? 'MessageQueueRetryingEvent' : 'MessageQueueDeliveryFailedEvent'} will be published for messageId '${props.messageId}', jobId '${retryJob.id}'`,
      );

      // Success logging with enhanced context
      const successContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueFailureUseCase',
          'scheduleRetry',
          `${user.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'SCHEDULE_RETRY',
            entityType: 'slack-message',
            phase: 'SUCCESS',
            messageId: props.messageId,
            correlationId: props.correlationId,
            retryJobId: retryJob.id?.toString(),
            nextRetryAttempt,
            retryDelayMs: retryDelay,
            queueName: 'deliver-slack-message',
            jobPriority: QUEUE_PRIORITIES.NORMAL,
          },
        );

      this.logger.log(
        successContext,
        `Successfully scheduled retry job for Slack message: messageId '${props.messageId}', jobId '${retryJob.id}', attempt ${nextRetryAttempt}`,
      );
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'MessageQueueFailureUseCase',
          'scheduleRetry',
          `${user.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'SCHEDULE_RETRY',
            entityType: 'slack-message',
            phase: 'ERROR',
            messageId: props.messageId,
            correlationId: props.correlationId,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessageQueue:
              error instanceof Error ? error.message : 'Unknown error',
            nextRetryAttempt,
            retryDelayMs: retryDelay,
            originalFailureReason: props.failureReason,
          },
        );

      this.logger.error(
        errorContext,
        `Failed to schedule retry for Slack message: messageId '${props.messageId}', attempt ${nextRetryAttempt}`,
      );
      throw error;
    }
  }
}
