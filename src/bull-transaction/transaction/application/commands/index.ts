/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

// generate-commands
import { CreateTransactionHandler } from './create/create-transaction.handler';
import { SendTransactionNotificationHandler } from './send-notification/send-transaction-notification.handler';

// application/commands/index.ts
export const TransactionCommands = [
  CreateTransactionHandler,
  SendTransactionNotificationHandler,
];

export * from './create/create-transaction.command';
export * from './send-notification/send-transaction-notification.command';
