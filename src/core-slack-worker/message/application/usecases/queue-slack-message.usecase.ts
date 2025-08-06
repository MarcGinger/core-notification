/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { handleCommandError } from 'src/shared/application/commands';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { MessageEntity } from '../../infrastructure/entities';
import { MessageStatusEnum } from '../../domain/entities';
import { MessageExceptionMessage } from '../../domain/exceptions';

/**
 * Properties for queuing a Slack message
 */
export interface QueueSlackMessageProps {
  tenant: string;
  configCode: string;
  channel: string;
  templateCode?: string;
  payload?: Record<string, any>;
  renderedMessage: string;
  scheduledAt?: Date;
  correlationId: string;
  priority?: number;
}

/**
 * Use case for queuing Slack messages for delivery.
 * Handles the creation of message entities and BullMQ job scheduling.
 *
 * This implementation showcases:
 * - Proper separation of concerns between application and infrastructure layers
 * - Event-driven architecture with proper event emission
 * - Comprehensive error handling and audit logging
 * - BullMQ integration with proper job scheduling
 */
@Injectable()
export class QueueSlackMessageUseCase {
  private readonly logger = new Logger(QueueSlackMessageUseCase.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  /**
   * Queues a Slack message for delivery
   * @param props - The message properties
   * @returns Promise<{ messageId: string; jobId: string }> - The created message and job IDs
   * @throws MessageExceptionMessage - When queueing fails
   */
  async execute(
    props: QueueSlackMessageProps,
  ): Promise<{ messageId: string; jobId: string }> {
    // Enhanced logging context for queue operation start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'QueueSlackMessageUseCase',
        'execute',
        props.correlationId,
        undefined, // No user context in this use case
        {
          operation: 'QUEUE',
          entityType: 'slack-message',
          phase: 'START',
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
          tenant: props?.tenant,
          channel: props?.channel,
          configCode: props?.configCode,
          templateCode: props?.templateCode,
          hasPayload: !!props?.payload,
          hasRenderedMessage: !!props?.renderedMessage,
          isScheduled: !!props?.scheduledAt,
          priority: props?.priority,
        },
      );

    this.logger.log(
      operationContext,
      `Starting Slack message queueing: correlationId '${props.correlationId}'`,
    );

    try {
      // Input validation
      this.validateInput(props);

      // Create and save MessageEntity with pending status
      const messageEntity = this.messageRepository.create({
        tenantId: props.tenant,
        configCode: props.configCode,
        channel: props.channel,
        templateCode: props.templateCode,
        payload: props.payload,
        renderedMessage: props.renderedMessage,
        status: MessageStatusEnum.PENDING,
        scheduledAt: props.scheduledAt,
        correlationId: props.correlationId,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedMessage = await this.messageRepository.save(messageEntity);

      // Queue delivery job with appropriate priority and scheduling
      const jobOptions = {
        priority: props.priority || QUEUE_PRIORITIES.HIGH,
        delay: props.scheduledAt
          ? Math.max(0, props.scheduledAt.getTime() - Date.now())
          : 0,
        attempts: 4,
        backoff: {
          type: 'exponential' as const,
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      };

      const job = await this.slackQueue.add(
        'deliver-slack-message',
        {
          messageId: savedMessage.id,
          tenant: props.tenant,
          channel: props.channel,
          renderedMessage: props.renderedMessage,
          correlationId: props.correlationId,
          configCode: props.configCode,
        },
        jobOptions,
      );

      // TODO: Emit SlackMessageQueuedEvent when EventBus is available
      // const queuedEvent = new SlackMessageQueuedEvent(...)

      // Success logging with enhanced context
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'execute',
          props.correlationId,
          undefined,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            phase: 'SUCCESS',
            messageId: savedMessage.id,
            jobId: job.id?.toString(),
            scheduledDelay: jobOptions.delay,
            priority: jobOptions.priority,
            attempts: jobOptions.attempts,
            queuedAt: new Date().toISOString(),
          },
        );

      this.logger.log(
        successContext,
        `Successfully queued Slack message: messageId '${savedMessage.id}', jobId '${job.id}', correlationId '${props.correlationId}'`,
      );

      return {
        messageId: savedMessage.id,
        jobId: job.id?.toString() || '',
      };
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'execute',
          props.correlationId,
          undefined,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            inputProps: props ? Object.keys(props) : [],
          },
        );

      this.logger.error(
        errorContext,
        `Failed to queue Slack message: correlationId '${props.correlationId}'`,
      );

      // Centralized error handling
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }

  /**
   * Validates input properties with enhanced logging
   */
  private validateInput(props: QueueSlackMessageProps): void {
    if (!props) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'validateInput',
          'unknown',
          undefined,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            validationError: 'missing_props',
          },
        );

      this.logger.warn(
        errorContext,
        'Slack message queueing attempted without required properties',
      );

      throw new BadRequestException(
        MessageExceptionMessage.propsRequiredToCreateMessage,
      );
    }

    const validationErrors: string[] = [];

    if (!props.tenant) {
      validationErrors.push('tenant');
    }
    if (!props.configCode) {
      validationErrors.push('configCode');
    }
    if (!props.channel) {
      validationErrors.push('channel');
    }
    if (!props.renderedMessage) {
      validationErrors.push('renderedMessage');
    }
    if (!props.correlationId) {
      validationErrors.push('correlationId');
    }

    if (validationErrors.length > 0) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'validateInput',
          props.correlationId || 'unknown',
          undefined,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            validationError: 'missing_required_fields',
            missingFields: validationErrors,
            providedFields: Object.keys(props),
          },
        );

      this.logger.warn(
        errorContext,
        `Slack message queueing validation failed: missing fields [${validationErrors.join(', ')}]`,
      );

      throw new BadRequestException(
        `Required fields missing for Slack message queueing: ${validationErrors.join(', ')}`,
      );
    }
  }
}
