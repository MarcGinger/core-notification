import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { handleCommandError } from 'src/shared/application/commands';
import { IUserToken } from 'src/shared/auth';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { v4 as uuidv4 } from 'uuid';
import { MessageQueueExceptionMessageQueue } from '../../domain/exceptions';
import { UpdateMessageQueueFactory } from '../../domain/factories';
import { UpdateMessageQueueProps } from '../../domain/properties';
import { MessageQueueWorkerLoggingHelper } from '../../domain/value-objects';
import { MessageQueueRepository } from '../../infrastructure/repositories';

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
export class QueueMessageQueueUseCase {
  private readonly logger = new Logger(QueueMessageQueueUseCase.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
    private readonly messageRepository: MessageQueueRepository,
  ) {}

  /**
   * Queues a Slack message for delivery using domain-driven approach
   * @param user - The user performing the operation
   * @param props - The message properties
   * @returns Promise<{ messageId: string; jobId: string }> - The created message and job IDs
   * @throws MessageQueueExceptionMessageQueue - When queueing fails
   */
  async execute(
    user: IUserToken,
    props: UpdateMessageQueueProps,
  ): Promise<{ messageId: string; jobId: string }> {
    // Input validation first
    this.validateInput(user, props);

    const correlationId = props.correlationId ?? uuidv4();

    // Enhanced logging context for queue operation start
    const operationContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'QueueMessageQueueUseCase',
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
      // Create message aggregate through domain service
      const messageAggregate = UpdateMessageQueueFactory.fromProps(
        props,
        correlationId,
      );

      // Queue delivery job with appropriate priority and scheduling
      const jobOptions = {
        priority: props.priority || QUEUE_PRIORITIES.HIGH,
        delay: messageAggregate.scheduledAt
          ? Math.max(0, messageAggregate.scheduledAt.getDelayInMs())
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
          tenant: user.tenant,
          correlationId: correlationId,
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
      const savedMessageQueue = await this.messageRepository.saveMessageQueue(
        user,
        messageAggregate,
      );

      // Success logging with enhanced context
      const successContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageQueueUseCase',
          'execute',
          props.correlationId,
          user,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            phase: 'SUCCESS',
            messageId: savedMessageQueue.id,
            jobId: job.id?.toString(),
            scheduledDelay: jobOptions.delay,
            priority: jobOptions.priority,
            attempts: jobOptions.attempts,
            queuedAt: new Date().toISOString(),
          },
        );

      this.logger.log(
        successContext,
        `Successfully queued Slack message: messageId '${savedMessageQueue.id}', tenant '${user.tenant}', jobId '${job.id}', correlationId '${props.correlationId}'`,
      );

      return {
        messageId: savedMessageQueue.id,
        jobId: job.id?.toString() || '',
      };
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageQueueUseCase',
          'execute',
          props.correlationId,
          user,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessageQueue:
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
      handleCommandError(
        error,
        null,
        MessageQueueExceptionMessageQueue.createError,
      );
      throw error;
    }
  }

  /**
   * Validates input properties with enhanced logging
   */
  private validateInput(
    user: IUserToken,
    props: UpdateMessageQueueProps,
  ): void {
    // User validation
    if (!user) {
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'QueueMessageQueueUseCase',
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
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageQueueUseCase',
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
        MessageQueueExceptionMessageQueue.propsRequiredToCreateMessageQueue,
      );
    }

    const validationErrors: string[] = [];

    if (validationErrors.length > 0) {
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackMessageQueueUseCase',
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
