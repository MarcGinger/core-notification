import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { handleCommandError } from 'src/shared/application/commands';
import { IUserToken } from 'src/shared/auth';
import { ITransaction } from '../../domain';
import { TransactionExceptionMessage } from '../../domain/exceptions';
import { UpdateTransactionProps } from '../../domain/properties';
import { TransactionRepository } from '../../infrastructure/repositories';

/**
 * Use case for processing (completing) transactions.
 * Simple implementation that marks transactions as completed with no complex business logic.
 */
@Injectable()
export class ProcessTransactionCreateUseCase {
  private readonly logger = new Logger(ProcessTransactionCreateUseCase.name);

  constructor(private readonly transactionRepository: TransactionRepository) {}

  /**
   * Validates input parameters
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
   * Simple transaction processing that marks transaction as completed
   * @param user - The user performing the operation
   * @param props - The transaction update properties (must include existing transaction ID)
   * @returns Promise<ITransaction> - The completed transaction
   */
  async execute(
    user: IUserToken,
    props: UpdateTransactionProps,
  ): Promise<ITransaction> {
    // Input validation
    this.validateInput(user, props);

    this.logger.log(
      `Processing transaction completion: transactionId '${props.id}', user '${user.sub}'`,
    );

    try {
      // Load existing transaction from repository
      const existingTransaction = await this.transactionRepository.getById(
        user,
        props.id,
      );

      if (!existingTransaction) {
        throw new BadRequestException(
          `Transaction with ID ${props.id} not found`,
        );
      }

      // Mark transaction as completed (this will emit domain events)
      existingTransaction.markAsCompleted(user, props);

      // Save the updated transaction
      await this.transactionRepository.saveTransaction(
        user,
        existingTransaction,
      );

      this.logger.log(
        `Transaction completed successfully: transactionId '${props.id}'`,
      );

      return existingTransaction.toDto();
    } catch (error) {
      this.logger.error(
        `Failed to complete transaction: transactionId '${props.id}', error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Centralized error handling
      handleCommandError(error, null, TransactionExceptionMessage.updateError);
      throw error;
    }
  }
}
