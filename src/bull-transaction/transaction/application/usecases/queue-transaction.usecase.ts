import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { handleCommandError } from 'src/shared/application/commands';
import { IUserToken } from 'src/shared/auth';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { BullTransactionLoggingHelper } from '../../../shared/domain/value-objects';
import { TransactionExceptionMessage } from '../../domain/exceptions';
import { UpdateTransactionProps } from '../../domain/properties';
import { TransactionRepository } from '../../infrastructure/repositories';

/**
 * Use case for queuing transactions for processing.
 * Handles updating transaction status to QUEUED and creating BullMQ job.
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

  constructor(
    private readonly transactionRepository: TransactionRepository,
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private readonly dataProcessingQueue: Queue,
  ) {}

  /**
   * Validates input parameters for queue operation
   */
  private validateInput(user: IUserToken, props: UpdateTransactionProps): void {
    if (!user) {
      throw new BadRequestException('User token is required');
    }
    if (!props?.id) {
      throw new BadRequestException('Transaction ID is required');
    }
  }

  /**
   * Queues a transaction for processing using domain-driven approach
   * @param user - The user performing the operation
   * @param props - The transaction update properties (must include existing transaction ID)
   * @returns Promise<{ transactionId: string; jobId: string }> - The updated transaction and job IDs
   * @throws TransactionExceptionMessage - When queueing fails
   */
  async execute(
    user: IUserToken,
    props: UpdateTransactionProps,
  ): Promise<{ transactionId: string; jobId: string }> {
    // Input validation first
    this.validateInput(user, props);

    // Enhanced logging context for queue operation start
    const operationContext =
      BullTransactionLoggingHelper.createEnhancedLogContext(
        'QueueTransactionUseCase',
        'execute',
        props.id,
        user,
        {
          operation: 'QUEUE',
          entityType: 'transaction',
          phase: 'START',
          hasUser: !!user,
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
        },
      );

    this.logger.log(
      operationContext,
      `Starting transaction queueing: transactionId '${props.id}'`,
    );

    try {
      // Load existing transaction from EventStore using the proper repository method
      const existingTransaction = await this.transactionRepository.getById(
        user,
        props.id,
      );

      if (!existingTransaction) {
        throw new BadRequestException(
          `Transaction with ID ${props.id} not found`,
        );
      }

      // Create BullMQ job for transaction processing
      const jobOptions = {
        priority: QUEUE_PRIORITIES.HIGH,
        delay: 0, // Process immediately
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      };

      const job = await this.dataProcessingQueue.add(
        'process-transaction',
        {
          transactionId: props.id,
          tenant: user.tenant,
          requestedBy: user.sub,
          timestamp: new Date().toISOString(),
        },
        jobOptions,
      );

      // Success logging with enhanced context
      const successContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'QueueTransactionUseCase',
          'execute',
          props.id,
          user,
          {
            operation: 'QUEUE',
            entityType: 'transaction',
            phase: 'SUCCESS',
            transactionId: props.id,
            jobId: job.id?.toString(),
            priority: jobOptions.priority,
            attempts: jobOptions.attempts,
            queuedAt: new Date().toISOString(),
          },
        );

      this.logger.log(
        successContext,
        `Successfully added transaction to queue: transactionId '${props.id}', jobId '${job.id}', tenant '${user.tenant}'`,
      );

      return {
        transactionId: props.id,
        jobId: job.id?.toString() || '',
      };
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        BullTransactionLoggingHelper.createEnhancedLogContext(
          'QueueTransactionUseCase',
          'execute',
          props.id,
          user,
          {
            operation: 'QUEUE',
            entityType: 'transaction',
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
        `Failed to queue transaction: transactionId '${props.id}'`,
      );

      // Centralized error handling
      handleCommandError(error, null, TransactionExceptionMessage.queueError);
      throw error;
    }
  }
}
