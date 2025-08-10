/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import {
  ITransactionMessageQueue,
  TransactionRefundData,
  TransactionSettlementData,
  TransactionValidationData,
} from '../../domain/services/transaction-message-queue.interface';

/**
 * Transaction Message Queue Service
 * Infrastructure implementation of the transaction message queue
 *
 * This service implements the domain interface using BullMQ as the underlying
 * queue technology. The domain logic remains unaware of BullMQ specifics.
 */
@Injectable()
export class TransactionMessageQueueService
  implements ITransactionMessageQueue
{
  private readonly logger = new Logger(TransactionMessageQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private readonly queue: Queue,
  ) {
    this.logger.log('TransactionMessageQueueService initialized');
  }

  async enqueueSettlement(
    data: TransactionSettlementData,
    correlationId?: string,
  ): Promise<void> {
    this.logger.log(
      `Enqueuing settlement for transaction ${data.txId}, amount: ${data.amount} ${data.currency}`,
    );

    await this.queue.add('transaction-settle', data, {
      attempts: 5,
      priority: QUEUE_PRIORITIES.HIGH,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: correlationId || data.txId,
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

    await this.queue.add('transaction-refund', data, {
      attempts: 3,
      priority: QUEUE_PRIORITIES.NORMAL,
      jobId: correlationId || data.txId,
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

    await this.queue.add('transaction-validate', data, {
      attempts: 2,
      priority: QUEUE_PRIORITIES.NORMAL,
      jobId: correlationId || data.txId,
    });

    this.logger.log(`Validation job enqueued for transaction ${data.txId}`);
  }
}
