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
 * Generic event emitted when a transaction is updated
 * Used for general state changes that don't have specific events
 */
export class TransactionUpdatedEvent extends TransactionDomainEvent {
  readonly eventType = 'transaction.updated.v1';

  constructor(
    user: IUserToken,
    aggregateId: string,
    props: ITransaction,
    public readonly updatedFields?: string[],
    public readonly previousValues?: Partial<ITransaction>,
  ) {
    super(user, aggregateId, props);
  }
}
