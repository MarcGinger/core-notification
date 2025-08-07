import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { handleCommandError } from 'src/shared/application/commands';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { MessageRepository } from '../../infrastructure/repositories';
import { MessageExceptionMessage } from '../../domain/exceptions';
import { MessageDomainService } from '../../domain/services';
import { IUserToken } from 'src/shared/auth';
import { CreateMessageProps } from '../../domain/properties';
import { Message } from '../../domain/aggregates';
import { MessageStatusEnum } from '../../domain/entities';
import { RenderMessageTemplateUseCase } from './render-message-template.usecase';
import { MessageFactory } from '../../domain/factories';

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
export class QueueMessageUseCase {
  private readonly logger = new Logger(QueueMessageUseCase.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
    private readonly messageRepository: MessageRepository,
    private readonly domainService: MessageDomainService,
    private readonly renderMessageTemplateUseCase: RenderMessageTemplateUseCase,
  ) {}

  /**
   * Queues a Slack message for delivery using domain-driven approach
   * @param user - The user performing the operation
   * @param props - The message properties
   * @returns Promise<{ messageId: string; jobId: string }> - The created message and job IDs
   * @throws MessageExceptionMessage - When queueing fails
   */
  async execute(
    user: IUserToken,
    props: CreateMessageProps,
  ): Promise<{ messageId: string; jobId: string }> {
    // Input validation first
    this.validateInput(user, props);

    const correlationId = props.correlationId ?? uuidv4();

    // Enhanced logging context for queue operation start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'QueueMessageUseCase',
        'execute',
        correlationId,
        user,
        {
          operation: 'QUEUE',
          entityType: 'slack-message',
          phase: 'START',
          hasUser: !!user,
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
          channel: props?.channel,
          configCode: props?.configCode,
          templateCode: props?.templateCode,
          hasPayload: !!props?.payload,
          isScheduled: !!props?.scheduledAt,
          priority: props?.priority,
        },
      );

    this.logger.log(
      operationContext,
      `Starting Slack message queueing: correlationId '${correlationId}'`,
    );

    try {
      // Render the message template
      const renderedMessage = await this.renderMessageTemplateUseCase.execute(
        user,
        props,
      );

      // Create message aggregate through domain service
      const messageAggregate = MessageFactory.fromProps(
        props,
        renderedMessage,
        correlationId,
      );

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
          messageId: messageAggregate.getId(),
          channel: props.channel,
          renderedMessage: renderedMessage,
          correlationId: correlationId,
          configCode: props.configCode,
        },
        jobOptions,
      );

      // Mark the message as queued and emit domain event
      messageAggregate.markAsQueued(
        user,
        job.id?.toString() || '',
        jobOptions.priority,
      );

      // Save the aggregate with the new events
      const savedMessage = await this.messageRepository.saveMessage(
        user,
        messageAggregate,
      );

      // Success logging with enhanced context
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'execute',
          props.correlationId,
          user,
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
          user,
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
  private validateInput(user: IUserToken, props: CreateMessageProps): void {
    // User validation
    if (!user) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueMessageUseCase',
          'validateInput',
          'unknown',
          undefined,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            validationError: 'missing_user',
          },
        );

      this.logger.warn(
        errorContext,
        'Slack message queueing attempted without user authentication',
      );

      throw new BadRequestException(
        'User authentication required for message queueing',
      );
    }

    if (!props) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'validateInput',
          'unknown',
          user,
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

    if (!props.configCode) {
      validationErrors.push('configCode');
    }
    if (!props.channel) {
      validationErrors.push('channel');
    }

    if (validationErrors.length > 0) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageUseCase',
          'validateInput',
          props.correlationId || 'unknown',
          user,
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
