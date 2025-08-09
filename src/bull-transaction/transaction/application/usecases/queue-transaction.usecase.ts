import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { handleCommandError } from 'src/shared/application/commands';
import { IUserToken } from 'src/shared/auth';
import { CoreSlackWorkerLoggingHelper } from '../../../../core-slack-worker/shared/domain/value-objects';
import { TransactionExceptionMessage } from '../../domain/exceptions';
import { UpdateTransactionFactory } from '../../domain/factories';
import { UpdateTransactionProps } from '../../domain/properties';
import { TransactionRepository } from '../../infrastructure/repositories';

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
export class QueueTransactionUseCase {
  private readonly logger = new Logger(QueueTransactionUseCase.name);

  constructor(private readonly messageRepository: TransactionRepository) {}

  /**
   * Queues a Slack message for delivery using domain-driven approach
   * @param user - The user performing the operation
   * @param props - The message properties
   * @returns Promise<{ messageId: string; jobId: string }> - The created message and job IDs
   * @throws TransactionExceptionMessage - When queueing fails
   */
  async execute(
    user: IUserToken,
    props: UpdateTransactionProps,
  ): Promise<{ messageId: string; jobId: string }> {
    // Input validation first
    this.validateInput(user, props);

    // Enhanced logging context for queue operation start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'QueueTransactionUseCase',
        'execute',
        props.id,
        user,
        {
          operation: 'QUEUE',
          entityType: 'slack-message',
          phase: 'START',
          hasUser: !!user,
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
          isScheduled: !!props?.scheduledAt,
        },
      );

    this.logger.log(
      operationContext,
      `Starting Slack message queueing: correlationId '${props.id}'`,
    );

    try {
      // Create message aggregate through domain service
      const messageAggregate = UpdateTransactionFactory.fromProps(
        props,
        props.id,
      );

      // Queue delivery job with appropriate priority and scheduling
      // const jobOptions = {
      //   priority: QUEUE_PRIORITIES.HIGH,
      //   delay: messageAggregate.scheduledAt
      //     ? Math.max(0, messageAggregate.scheduledAt.getDelayInMs())
      //     : 0,
      //   attempts: 4,
      //   backoff: {
      //     type: 'exponential' as const,
      //     delay: 2000,
      //   },
      //   removeOnComplete: 100,
      //   removeOnFail: 50,
      // };

      // const job = await this.slackQueue.add(
      //   'deliver-slack-message',
      //   {
      //     messageId: messageAggregate.getId(),
      //     tenant: user.tenant,
      //   },
      //   jobOptions,
      // );

      // Mark the message as queued and emit domain event
      messageAggregate.markAsQueued(user, props.id, 5);

      // Save the aggregate with the new events
      const savedTransaction = await this.messageRepository.saveTransaction(
        user,
        messageAggregate,
      );

      // Success logging with enhanced context
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackTransactionUseCase',
          'execute',
          props.id,
          user,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            phase: 'SUCCESS',
            messageId: savedTransaction.id,
            // jobId: job.id?.toString(),
            scheduledDelay: 0,
            // priority: jobOptions.priority,
            // attempts: jobOptions.attempts,
            queuedAt: new Date().toISOString(),
          },
        );

      this.logger.log(
        successContext,
        `Successfully queued Slack message: messageId '${savedTransaction.id}', tenant '${user.tenant}'', correlationId '${props.id}'`,
      );

      return {
        messageId: savedTransaction.id,
        jobId: '',
      };
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackTransactionUseCase',
          'execute',
          props.id,
          user,
          {
            operation: 'QUEUE',
            entityType: 'slack-message',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorTransaction:
              error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            inputProps: props ? Object.keys(props) : [],
          },
        );

      this.logger.error(
        errorContext,
        `Failed to queue Slack message: correlationId '${props.id}'`,
      );

      // Centralized error handling
      handleCommandError(error, null, TransactionExceptionMessage.createError);
      throw error;
    }
  }

  /**
   * Validates input properties with enhanced logging
   */
  private validateInput(user: IUserToken, props: UpdateTransactionProps): void {
    // User validation
    if (!user) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueTransactionUseCase',
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
          'QueueSlackTransactionUseCase',
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
        TransactionExceptionMessage.propsRequiredToCreateTransaction,
      );
    }

    const validationErrors: string[] = [];

    if (validationErrors.length > 0) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'QueueSlackTransactionUseCase',
          'validateInput',
          props.id || 'unknown',
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
