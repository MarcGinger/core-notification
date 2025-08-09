/**
 * Copyimport { CreateTransactionUseCase } from './create-transaction.usecase';
import { SendTransactionNotificationUseCase } from './send-transaction-notification.usecase';

// application/usecases/index.ts
export const TransactionUseCases = [
  CreateTransactionUseCase,
  SendTransactionNotificationUseCase,
];

export { CreateTransactionUseCase, SendTransactionNotificationUseCase }; 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateTransactionUseCase } from './create-transaction.usecase';
import { SendTransactionNotificationUseCase } from './send-transaction-notification.usecase';

// application/commands/index.ts
export const TransactionUseCases = [
  CreateTransactionUseCase,
  SendTransactionNotificationUseCase,
];

export { CreateTransactionUseCase, SendTransactionNotificationUseCase };
