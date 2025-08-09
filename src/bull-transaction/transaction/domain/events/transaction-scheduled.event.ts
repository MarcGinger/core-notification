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
 * Event emitted when a transaction is scheduled for future processing
 */
export class TransactionScheduledEvent extends TransactionDomainEvent {
  readonly eventType = 'transaction.scheduled.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: ITransaction,
    public readonly scheduledAt: Date,
    public readonly previousStatus: string,
  ) {
    super(user, aggregateId, props);
  }
}
