import { Transaction } from '../aggregates';
import { ITransaction, TransactionStatusEnum } from '../entities';
import { UpdateTransactionProps } from '../properties';

export class UpdateTransactionFactory {
  /**
   * Creates a Transaction aggregate from the provided props and rendered transaction.
   * @param props - The user-supplied UpdateTransactionProps
   * @param renderedTransaction - The rendered transaction from the template
   * @param correlationId - Optional correlationId (will be generated if missing)
   * @returns A fully initialized Transaction aggregate
   */
  static fromProps(
    props: UpdateTransactionProps,
    correlationId?: string,
  ): Transaction {
    const transactionEntity: ITransaction = {
      ...props,
      status: TransactionStatusEnum.PENDING,
      retryCount: 0,
      priority: 1,
    };

    return new Transaction(Transaction.fromEntity(transactionEntity));
  }
}
