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
 * Event emitted when a transaction is being retried after failure
 */
export class TransactionRetryingEvent extends TransactionDomainEvent {
  readonly eventType = 'transaction.retrying.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: ITransaction,
    public readonly retryAttempt: number,
    public readonly nextRetryAt: Date,
    public readonly previousStatus: string,
    public readonly lastFailureReason?: string,
  ) {
    super(user, aggregateId, props);
  }
}
