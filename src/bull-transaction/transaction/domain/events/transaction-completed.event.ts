/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from 'src/shared/auth';
import { ITransaction } from '../entities';
import { TransactionDomainEvent } from './transaction-domain.event';

/**
 * Event emitted when a transaction has been successfully processed/completed
 * This represents the successful completion of the transaction
 */
export class TransactionCompletedEvent extends TransactionDomainEvent {
  readonly eventType = 'transaction.completed.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: ITransaction,
    public readonly completedAt: Date,
    public readonly previousStatus: string,
    public readonly processingDetails?: Record<string, any>,
  ) {
    super(user, aggregateId, props);
  }
}
