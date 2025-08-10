/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

/**
 * Transaction Domain Job Types
 * Defines the payload structures for all transaction-related queue jobs
 */

export interface TransactionJobPayloadMap {
  'transaction.settle': {
    txId: string;
    amount: number;
    currency: string;
    fromAccount: string;
    toAccount: string;
  };

  'transaction.refund': {
    txId: string;
    reason: string;
    amount?: number; // partial refund
  };

  'transaction.validate': {
    txId: string;
    rules: string[];
  };

  // Notification jobs for transaction events
  'process-transaction-notification': {
    eventData: any;
    meta: any;
    routedBy: string;
    routedAt: string;
  };
}

export type TransactionJobType = keyof TransactionJobPayloadMap;

export type TransactionJobPayload<T extends TransactionJobType> =
  TransactionJobPayloadMap[T];
