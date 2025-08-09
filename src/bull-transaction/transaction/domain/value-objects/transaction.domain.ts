/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ITransaction } from '../entities';
import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';

export function transactionEquals(
  a: ITransaction | undefined,
  b: ITransaction | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.amount === b.amount &&
    (a.scheduledAt === b.scheduledAt ||
      (a.scheduledAt instanceof Date &&
        b.scheduledAt instanceof Date &&
        a.scheduledAt.getTime() === b.scheduledAt.getTime()))
  );
}

export function validateTransaction(
  input: ITransaction | string,
): ITransaction {
  let obj: ITransaction;
  if (typeof input === 'string') {
    obj = { id: input } as ITransaction;
  } else {
    obj = { ...input };
  }
  if (obj.from === undefined || obj.from === null) {
    throw new TransactionDomainException(
      TransactionExceptionMessage.requiredFrom,
    );
  }
  if (obj.to === undefined || obj.to === null) {
    throw new TransactionDomainException(
      TransactionExceptionMessage.requiredTo,
    );
  }
  if (obj.amount === undefined || obj.amount === null) {
    throw new TransactionDomainException(
      TransactionExceptionMessage.requiredAmount,
    );
  }
  if (Array.isArray(obj.amount) && obj.amount.length === 0) {
    throw new TransactionDomainException(
      TransactionExceptionMessage.emptyAmountArray,
    );
  }
  // No relationships to normalize, return input as is
  return obj;
}

export function toTransaction(input: ITransaction | string): ITransaction {
  if (typeof input === 'string') {
    throw new TransactionDomainException(
      TransactionExceptionMessage.invalidInputTypeForConversion,
    );
  }
  const Transaction = { ...input };
  validateTransaction(Transaction);
  return Transaction;
}
