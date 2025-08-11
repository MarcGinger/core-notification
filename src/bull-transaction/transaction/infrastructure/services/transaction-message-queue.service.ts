/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IGenericQueue,
  PRIORITY_LEVELS,
  QUEUE_NAMES,
  QUEUE_TOKENS,
} from '../../../../shared/message-queue';
import {
  ITransactionMessageQueue,
  TransactionRefundData,
  TransactionSettlementData,
  TransactionValidationData,
} from '../../domain/interfaces/transaction-message-queue.interface';

/**
 * Transaction Message Queue Service
 *
 * Domain-specific implementation of transaction queue operations.
 * Uses the generic queue infrastructure while maintaining domain boundaries.
 * Follows the production specifications from COPILOT_INSTRUCTIONS.md
 */
@Injectable()
export class TransactionMessageQueueService
  implements ITransactionMessageQueue
{
  private readonly logger = new Logger(TransactionMessageQueueService.name);

  constructor(
    @Inject(QUEUE_TOKENS.QUEUE_REGISTRY)
    private readonly queueRegistry: Map<string, IGenericQueue>,
  ) {
    this.logger.log('TransactionMessageQueueService initialized');
  }

  /**
   * Get the transaction processing queue from the registry
   */
  private getQueue(): IGenericQueue {
    const queue = this.queueRegistry.get(QUEUE_NAMES.TRANSACTION_PROCESSING);
    if (!queue) {
      throw new Error('Transaction processing queue not found');
    }
    return queue;
  }

  async enqueueSettlement(
    data: TransactionSettlementData,
    correlationId?: string,
  ): Promise<void> {
    this.logger.log(
      `Enqueuing settlement for transaction ${data.txId}, amount: ${data.amount} ${data.currency}`,
    );

    await this.getQueue().add('transaction.settlement.v1', data, {
      attempts: 5,
      priority: PRIORITY_LEVELS.HIGH,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: correlationId || `settlement-${data.txId}`,
    });

    this.logger.log(`Settlement job enqueued for transaction ${data.txId}`);
  }

  async enqueueRefund(
    data: TransactionRefundData,
    correlationId?: string,
  ): Promise<void> {
    this.logger.log(
      `Enqueuing refund for transaction ${data.txId}, reason: ${data.reason}`,
    );

    await this.getQueue().add('transaction.refund.v1', data, {
      attempts: 3,
      priority: PRIORITY_LEVELS.HIGH,
      jobId: correlationId || `refund-${data.txId}`,
    });

    this.logger.log(`Refund job enqueued for transaction ${data.txId}`);
  }

  async enqueueValidation(
    data: TransactionValidationData,
    correlationId?: string,
  ): Promise<void> {
    this.logger.log(
      `Enqueuing validation for transaction ${data.txId}, rules: ${data.rules.length}`,
    );

    await this.getQueue().add('transaction.validation.v1', data, {
      attempts: 2,
      priority: PRIORITY_LEVELS.NORMAL,
      jobId: correlationId || `validation-${data.txId}`,
    });

    this.logger.log(`Validation job enqueued for transaction ${data.txId}`);
  }
}
