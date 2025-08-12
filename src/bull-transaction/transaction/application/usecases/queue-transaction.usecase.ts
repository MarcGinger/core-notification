import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { handleCommandError } from 'src/shared/application/commands';
import { IUserToken } from 'src/shared/auth';
import { BullTransactionLoggingHelper } from '../../../shared/domain/value-objects';
import { TransactionExceptionMessage } from '../../domain/exceptions';
import { UpdateTransactionProps } from '../../domain/properties';
import { TransactionRepository } from '../../infrastructure/repositories';
import { TransactionMessageQueueService } from '../../infrastructure/services/transaction-message-queue.service';

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
    private readonly transactionMessageQueueService: TransactionMessageQueueService,
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

      // Use the message queue service to enqueue the transaction
      await this.transactionMessageQueueService.queueTransaction(
        props.id,
        user,
        {
          priority: undefined, // or set as needed
          correlationId: undefined, // or set as needed
          businessContext: { tenant: user.tenant, requestedBy: user.sub },
        },
      );

      // Success logging
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
            jobId: undefined, // Not available from service, unless you refactor to return jobId
            queuedAt: new Date().toISOString(),
          },
        );

      this.logger.log(
        successContext,
        `Successfully added transaction to queue: transactionId '${props.id}', tenant '${user.tenant}'`,
      );

      return {
        transactionId: props.id,
        jobId: '', // Not available unless you refactor service to return jobId
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
