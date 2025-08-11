/**
 * Example: How to use the Transaction Job Dispatcher with Clean Architecture
 *
 * This example shows how to properly inject and use the transaction job dispatcher
 * interface instead of directly depending on BullMQ infrastructure.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  ITransactionJobDispatcher,
  TransactionJobData,
} from './domain/services/transaction-job-dispatcher.interface';

@Injectable()
export class ExampleTransactionService {
  constructor(
    // ✅ CORRECT: Inject the domain interface, not the concrete implementation
    @Inject('ITransactionJobDispatcher')
    private readonly jobDispatcher: ITransactionJobDispatcher,
  ) {}

  async initiateTransactionProcessing(
    transactionId: string,
    operationType: 'withdrawal' | 'deposit' | 'transfer',
    amount: number,
    currency: string,
  ): Promise<void> {
    const jobData: TransactionJobData = {
      transactionId,
      operationType,
      amount,
      currency,
      tenant: 'example-tenant',
      correlationId: `tx-${transactionId}-${Date.now()}`,
      priority: 'normal',
    };

    // ✅ CORRECT: Use domain interface methods - no knowledge of BullMQ
    await this.jobDispatcher.dispatchTransactionProcessing(jobData);
  }

  async processBatchTransactions(
    transactions: Array<{
      id: string;
      type: 'withdrawal' | 'deposit' | 'transfer';
      amount: number;
      currency: string;
    }>,
  ): Promise<void> {
    const jobsData: TransactionJobData[] = transactions.map((tx) => ({
      transactionId: tx.id,
      operationType: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      tenant: 'example-tenant',
      priority: 'normal',
    }));

    // ✅ CORRECT: Use domain interface methods - infrastructure agnostic
    await this.jobDispatcher.dispatchBatchTransactionProcessing(jobsData);
  }
}

/*
❌ WRONG WAY (before refactoring):

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BadExampleService {
  constructor(
    // ❌ WRONG: Direct BullMQ dependency in business logic
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private readonly queue: Queue,
  ) {}

  async badMethod() {
    // ❌ WRONG: Business logic knows about BullMQ implementation details
    await this.queue.add('process-transaction', data, { attempts: 3 });
  }
}

✅ RIGHT WAY (after refactoring):

- Business logic depends only on domain interfaces
- Infrastructure details (BullMQ) hidden in infrastructure layer
- Easy to test with mock interfaces
- Can swap queue technology without changing business logic
- Clean separation of concerns
*/
