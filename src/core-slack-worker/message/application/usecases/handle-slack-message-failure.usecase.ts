/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { MessageEntity } from '../../infrastructure/entities';
import { MessageStatusEnum } from '../../domain/entities';

/**
 * Properties for handling Slack message failure
 */
export interface HandleSlackMessageFailureProps {
  messageId: string;
  tenant: string;
  channel: string;
  correlationId: string;
  configCode: string;
  failureReason: string;
  retryCount: number;
  willRetry: boolean;
}

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
export class HandleSlackMessageFailureUseCase {
  private readonly logger = new Logger(HandleSlackMessageFailureUseCase.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  /**
   * Handles Slack message delivery failure
   * @param props - The failure properties
   * @returns Promise<void>
   */
  async execute(props: HandleSlackMessageFailureProps): Promise<void> {
    // Enhanced logging context for failure handling start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'HandleSlackMessageFailureUseCase',
        'execute',
        `${props.tenant}-${props.messageId}`,
        undefined, // No user context in failure handling
        {
          operation: 'HANDLE_FAILURE',
          entityType: 'slack-message',
          phase: 'START',
          messageId: props.messageId,
          correlationId: props.correlationId,
          tenant: props.tenant,
          channel: props.channel,
          failureReason: props.failureReason,
          retryCount: props.retryCount,
          willRetry: props.willRetry,
          configCode: props.configCode,
          failureType: props.willRetry ? 'retryable' : 'permanent',
        },
      );

    this.logger.warn(
      operationContext,
      `Processing Slack message delivery failure: messageId '${props.messageId}', reason '${props.failureReason}', willRetry: ${props.willRetry}`,
    );

    try {
      // Update message entity
      const updateData: Partial<MessageEntity> = {
        retryCount: props.retryCount,
        failureReason: props.failureReason,
        updatedAt: new Date(),
      };

      if (!props.willRetry) {
        updateData.status = MessageStatusEnum.FAILED;
      }

      await this.messageRepository.update(
        {
          tenantId: props.tenant,
          id: props.messageId,
        },
        updateData,
      );

      // Handle retry logic
      if (props.willRetry) {
        await this.scheduleRetry(props);
      }

      // Success logging with enhanced context
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'HandleSlackMessageFailureUseCase',
          'execute',
          `${props.tenant}-${props.messageId}`,
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
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'HandleSlackMessageFailureUseCase',
          'execute',
          `${props.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'HANDLE_FAILURE',
            entityType: 'slack-message',
            phase: 'ERROR',
            messageId: props.messageId,
            correlationId: props.correlationId,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
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
    props: HandleSlackMessageFailureProps,
  ): Promise<void> {
    const retryDelay = Math.min(Math.pow(2, props.retryCount) * 1000, 60000); // Max 1 minute
    const nextRetryAttempt = props.retryCount + 1;

    // Enhanced logging context for retry scheduling start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'HandleSlackMessageFailureUseCase',
        'scheduleRetry',
        `${props.tenant}-${props.messageId}`,
        undefined,
        {
          operation: 'SCHEDULE_RETRY',
          entityType: 'slack-message',
          phase: 'START',
          messageId: props.messageId,
          correlationId: props.correlationId,
          tenant: props.tenant,
          channel: props.channel,
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
          tenant: props.tenant,
          channel: props.channel,
          correlationId: props.correlationId,
          configCode: props.configCode,
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

      // Emit retry event
      // TODO: Publish retryEvent to EventBus or EventStore when available
      // For now, we'll log the event details for audit purposes
      const eventLogContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'HandleSlackMessageFailureUseCase',
          'scheduleRetry',
          `${props.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'SCHEDULE_RETRY',
            entityType: 'slack-message',
            phase: 'EVENT_CREATED',
            messageId: props.messageId,
            correlationId: props.correlationId,
            eventType: 'SlackMessageRetriedEvent',
            retryJobId: retryJob.id?.toString(),
            nextRetryAttempt,
            retryDelayMs: retryDelay,
            eventTimestamp: new Date().toISOString(),
          },
        );

      this.logger.log(
        eventLogContext,
        `Created SlackMessageRetriedEvent for messageId '${props.messageId}', jobId '${retryJob.id}'`,
      );

      // Success logging with enhanced context
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'HandleSlackMessageFailureUseCase',
          'scheduleRetry',
          `${props.tenant}-${props.messageId}`,
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
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'HandleSlackMessageFailureUseCase',
          'scheduleRetry',
          `${props.tenant}-${props.messageId}`,
          undefined,
          {
            operation: 'SCHEDULE_RETRY',
            entityType: 'slack-message',
            phase: 'ERROR',
            messageId: props.messageId,
            correlationId: props.correlationId,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
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
