/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { AggregateRoot } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ITransaction } from '../entities';
import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';
import { TransactionProps } from '../properties';
import { IAggregateWithDto } from 'src/shared/domain/domain.model';
import { TransactionIdentifier } from '../value-objects';
import { TransactionCreatedEvent } from '../events';

export class Transaction
  extends AggregateRoot
  implements IAggregateWithDto<ITransaction>
{
  private readonly _id: TransactionIdentifier;
  private _from: string;
  private _to: string;
  private _amount: number;
  private _scheduledAt?: Date;

  constructor(props: TransactionProps) {
    super();
    this._id = props.id;
    this._from = props.from;
    this._to = props.to;
    this._amount = props.amount;
    this._scheduledAt = props.scheduledAt;
    this.validateState();
  }

  getId(): string {
    return this._id.toString();
  }

  get id(): TransactionIdentifier {
    return this._id;
  }

  public get from(): string {
    return this._from;
  }

  public get to(): string {
    return this._to;
  }

  public get amount(): number {
    return this._amount;
  }

  public get scheduledAt(): Date | undefined {
    return this._scheduledAt;
  }

  /**
   * Factory method for reconstructing Transaction aggregate from persisted entity data
   * This ensures proper value object creation during repository hydration
   * @param entity - The persisted transaction entity from repository
   * @returns Properly reconstructed Transaction aggregate
   */
  public static fromEntity(entity: ITransaction): Transaction {
    const props: TransactionProps = {
      id: TransactionIdentifier.fromString(entity.id),
      from: entity.from,
      to: entity.to,
      amount: entity.amount,
      scheduledAt: entity.scheduledAt,
    };

    return new Transaction(props);
  }

  public toDto(): ITransaction {
    return {
      id: this._id.value,
      from: this._from,
      to: this._to,
      amount: this._amount,
      scheduledAt: this._scheduledAt,
    };
  }

  /**
   * Factory method to create a new Transaction aggregate with proper event sourcing
   * Use this method instead of the constructor when creating new transactions
   * @param user - The user creating the transaction
   * @param props - The transaction properties
   * @returns A new Transaction aggregate with TransactionCreatedEvent applied
   */
  static create(user: IUserToken, props: TransactionProps): Transaction {
    const transaction = new Transaction(props);

    // Emit creation event for event sourcing
    transaction.apply(
      new TransactionCreatedEvent(
        user,
        transaction.getId(),
        transaction.toDto(),
      ),
    );

    return transaction;
  }

  private validateState(): void {
    if (!this._id) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldIdRequired,
      );
    }

    if (!this._from) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldFromRequired,
      );
    }

    if (!this._to) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldToRequired,
      );
    }

    if (!this._amount) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldAmountRequired,
      );
    }
  }

  public toProps(): TransactionProps {
    return {
      id: this._id,
      from: this._from,
      to: this._to,
      amount: this._amount,
      scheduledAt: this._scheduledAt,
    };
  }
}
