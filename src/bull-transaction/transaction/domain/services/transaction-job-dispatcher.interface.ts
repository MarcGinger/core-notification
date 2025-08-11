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
 * Transaction Job Data Interface
 * Represents the data structure for transaction processing jobs
 */
export interface TransactionJobData {
  transactionId: string;
  operationType: 'withdrawal' | 'deposit' | 'transfer';
  amount: number;
  currency: string;
  fromAccount?: string;
  toAccount?: string;
  description?: string;
  metadata?: Record<string, any>;
  tenant: string;
  correlationId?: string;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Transaction Job Dispatcher Interface
 * Domain contract for dispatching transaction processing jobs
 *
 * This interface abstracts away the underlying queue implementation,
 * allowing the domain to remain unaware of BullMQ specifics.
 */
export interface ITransactionJobDispatcher {
  /**
   * Dispatch a single transaction processing job
   * @param jobData The transaction job data to process
   */
  dispatchTransactionProcessing(jobData: TransactionJobData): Promise<void>;

  /**
   * Dispatch multiple transaction processing jobs in batch
   * @param jobsData Array of transaction job data to process
   */
  dispatchBatchTransactionProcessing(
    jobsData: TransactionJobData[],
  ): Promise<void>;
}
