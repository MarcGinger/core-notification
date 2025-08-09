import { randomUUID } from 'crypto';
import { IUserToken } from 'src/shared/auth';
import { Transaction } from '../aggregates';
import { TransactionStatusEnum } from '../entities';
import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';
import { CreateTransactionProps } from '../properties';
import { ScheduledAt, TransactionIdentifier } from '../value-objects';

export class CreateTransactionFactory {
  /**
   * Creates a Transaction aggregate from the provided props and rendered message.
   * @param props - The user-supplied CreateTransactionProps
   * @param renderedTransaction - The rendered message from the template
   * @param correlationId - Optional correlationId (will be generated if missing)
   * @returns A fully initialized Transaction aggregate
   */
  static fromProps(
    user: IUserToken,
    props: CreateTransactionProps,
    correlationId?: string,
  ): Transaction {
    const scheduledAt = ScheduledAt.create(props.scheduledAt);

    // ✅ Validate "future" constraint before passing to aggregate
    if (scheduledAt.getValue() && !scheduledAt.isFuture()) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.scheduledAtMustBeInFuture,
      );
    }

    // Generate unique identifier for the new message
    const messageCode = randomUUID();

    // Create the aggregate using the factory method which emits creation events
    const message = Transaction.create(user, {
      id: TransactionIdentifier.fromString(messageCode),
      to: props.to,
      from: props.from,
      amount: props.amount,
      status: TransactionStatusEnum.PENDING,
      scheduledAt,
      retryCount: 0,
      correlationId: correlationId ?? randomUUID(),
    });

    if (message.scheduledAt && !message.scheduledAt.isFuture()) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.scheduledAtMustBeInFuture,
      );
    }

    return message;
  }
}
