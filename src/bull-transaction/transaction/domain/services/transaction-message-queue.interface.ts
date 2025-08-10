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
 * Transaction Settlement Data
 * Data structure for settlement operations
 */
export interface TransactionSettlementData {
  txId: string;
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
}

/**
 * Transaction Refund Data
 * Data structure for refund operations
 */
export interface TransactionRefundData {
  txId: string;
  reason: string;
  amount?: number;
}

/**
 * Transaction Validation Data
 * Data structure for validation operations
 */
export interface TransactionValidationData {
  txId: string;
  rules: string[];
}

/**
 * Transaction Message Queue Interface
 * Domain-specific abstraction for transaction message operations
 *
 * This interface provides a clean separation between domain logic and infrastructure.
 * Business handlers depend only on this interface, not on specific queue implementations.
 */
export interface ITransactionMessageQueue {
  /**
   * Enqueue a transaction settlement job
   * @param data Settlement data
   * @param correlationId Optional correlation ID for tracking
   */
  enqueueSettlement(
    data: TransactionSettlementData,
    correlationId?: string,
  ): Promise<void>;

  /**
   * Enqueue a transaction refund job
   * @param data Refund data
   * @param correlationId Optional correlation ID for tracking
   */
  enqueueRefund(
    data: TransactionRefundData,
    correlationId?: string,
  ): Promise<void>;

  /**
   * Enqueue a transaction validation job
   * @param data Validation data
   * @param correlationId Optional correlation ID for tracking
   */
  enqueueValidation(
    data: TransactionValidationData,
    correlationId?: string,
  ): Promise<void>;
}

/**
 * Token for dependency injection
 */
export const TRANSACTION_MESSAGE_QUEUE_TOKEN = 'ITransactionMessageQueue';
