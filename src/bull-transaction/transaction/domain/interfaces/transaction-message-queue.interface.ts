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
 * Transaction Domain Message Queue Interface
 *
 * Defines the message queue operations specific to the transaction domain.
 * Following clean architecture principles with domain-specific types.
 */

export interface TransactionSettlementData {
  txId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  merchantId: string;
  timestamp: Date;
}

export interface TransactionValidationData {
  txId: string;
  rules: string[];
  riskScore: number;
  userId?: string;
  merchantId: string;
}

export interface TransactionRefundData {
  txId: string;
  originalAmount: number;
  refundAmount: number;
  reason: string;
  requestedBy: string;
}

/**
 * Transaction Message Queue Interface
 *
 * Defines the contract for transaction-specific queue operations.
 * Each method corresponds to a specific business operation in the transaction domain.
 */
export interface ITransactionMessageQueue {
  /**
   * Enqueue a transaction settlement job
   */
  enqueueSettlement(
    data: TransactionSettlementData,
    correlationId?: string,
  ): Promise<void>;

  /**
   * Enqueue a transaction validation job
   */
  enqueueValidation(
    data: TransactionValidationData,
    correlationId?: string,
  ): Promise<void>;

  /**
   * Enqueue a transaction refund job
   */
  enqueueRefund(
    data: TransactionRefundData,
    correlationId?: string,
  ): Promise<void>;
}
