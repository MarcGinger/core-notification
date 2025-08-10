/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 */

import { CreateTransactionUseCase } from './create-transaction.usecase';
import { QueueTransactionUseCase } from './queue-transaction.usecase';

// application/usecases/index.ts
export const TransactionUseCases = [
  CreateTransactionUseCase,
  QueueTransactionUseCase,
];

export { CreateTransactionUseCase } from './create-transaction.usecase';
export { QueueTransactionUseCase } from './queue-transaction.usecase';
