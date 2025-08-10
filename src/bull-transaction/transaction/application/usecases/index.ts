/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 */

import { CreateTransactionUseCase } from './create-transaction.usecase';
import { QueueTransactionUseCase } from './queue-transaction.usecase';
import { SendTransactionNotificationUseCase } from './send-transaction-notification.usecase';

// application/usecases/index.ts
export const TransactionUseCases = [
  CreateTransactionUseCase,
  QueueTransactionUseCase,
  SendTransactionNotificationUseCase,
];

export { CreateTransactionUseCase } from './create-transaction.usecase';
export { QueueTransactionUseCase } from './queue-transaction.usecase';
export { SendTransactionNotificationUseCase } from './send-transaction-notification.usecase';
