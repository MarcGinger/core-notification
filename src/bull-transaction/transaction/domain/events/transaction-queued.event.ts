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
 * Event emitted when a transaction has been queued for processing
 * This represents the transition from creation to queued state
 */
export class TransactionQueuedEvent extends TransactionDomainEvent {
  readonly eventType = 'transaction.queued.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: ITransaction,
    public readonly queuedAt: Date,
    public readonly jobId: string,
    public readonly priority: number,
    public readonly previousStatus: string,
  ) {
    super(user, aggregateId, props);
  }
}
