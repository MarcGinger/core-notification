/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { IUserToken } from 'src/shared/auth';
import { QUEUE_NAMES } from 'src/shared/infrastructure/bullmq';
import { ILogger } from 'src/shared/logger';
import {
  ProcessTransactionResult,
  TransactionApplicationService,
} from '../../application/services';
import { TransactionJobData } from '../../domain/services/transaction-job-dispatcher.interface';

/**
 * BullMQ processor for handling Transaction processing jobs
 * This is a thin coordinator that delegates business logic to use cases
 * Following DDD principles - infrastructure should only handle technical concerns
 */
@Injectable()
@Processor(QUEUE_NAMES.DATA_PROCESSING)
export class TransactionProcessor extends WorkerHost {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly transactionService: TransactionApplicationService,
  ) {
    super();
    this.logger.log(
      {
        component: 'TransactionProcessor',
        method: 'constructor',
      },
      'TransactionProcessor constructor called - processor instantiated',
    );
  }

  onModuleInit() {
    this.logger.log(
      {
        component: 'TransactionProcessor',
        method: 'onModuleInit',
      },
      'TransactionProcessor onModuleInit called - worker should be starting',
    );
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log(
      {
        component: 'TransactionProcessor',
        method: 'onReady',
      },
      'TransactionProcessor worker is ready and listening for jobs',
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      {
        component: 'TransactionProcessor',
        method: 'onActive',
        jobId: job.id,
      },
      'TransactionProcessor worker started processing job',
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      {
        component: 'TransactionProcessor',
        method: 'onCompleted',
        jobId: job.id,
      },
      'TransactionProcessor worker completed job',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(
      {
        component: 'TransactionProcessor',
        method: 'onFailed',
        jobId: job?.id,
        error: err.message,
      },
      'TransactionProcessor worker failed to process job',
    );
  }

  async process(job: Job<TransactionJobData>): Promise<any> {
    const { data } = job;
    const logContext = {
      jobId: job.id,
      transactionId: data.transactionId,
      correlationId: data.correlationId,
      tenant: data.tenant,
      operationType: data.operationType,
      amount: data.amount,
      currency: data.currency,
      isRetry: data.isRetry || false,
      retryAttempt: data.retryAttempt || 0,
    };

    this.logger.log(
      {
        ...logContext,
        component: 'TransactionProcessor',
        method: 'process',
      },
      'TransactionProcessor.process() called - starting job processing',
    );

    try {
      this.logger.log(logContext, 'Processing Transaction delivery job');

      // Create system user token for audit purposes
      const systemUser: IUserToken = {
        sub: 'system',
        name: 'Transaction Worker',
        email: 'transaction-worker@internal',
        tenant: data.tenant,
      };

      // Delegate to application service - all business logic is handled there
      const result: ProcessTransactionResult =
        await this.transactionService.processTransaction(systemUser, {
          id: data.transactionId,
          operationType: data.operationType,
          amount: data.amount,
          currency: data.currency,
          fromAccount: data.fromAccount,
          toAccount: data.toAccount,
          description: data.description,
          metadata: data.metadata,
          isRetry: data.isRetry,
          retryAttempt: data.retryAttempt || job.attemptsMade,
          priority: data.priority || 'normal',
        });

      if (result.success) {
        this.logger.log(
          {
            ...logContext,
            processingResult: result.processingResult,
            status: result.status,
          },
          'Successfully processed Transaction',
        );

        return {
          ok: true,
          transactionId: data.transactionId,
          status: result.status,
          processingResult: result.processingResult,
          processedAt: new Date().toISOString(),
        };
      } else {
        // Handle failure based on use case result
        if (result.isRetryable) {
          // For retryable errors, throw to let BullMQ handle retry logic
          const error = new Error(result.error || 'Unknown retryable error');
          throw error;
        } else {
          // For permanent errors, don't throw (prevents retries)
          this.logger.error(
            {
              ...logContext,
              error: result.error,
              userFriendlyMessage: result.userFriendlyMessage,
              errorType: 'permanent',
            },
            'Transaction processing permanently failed',
          );
          return; // Don't throw to prevent retries
        }
      }
    } catch (error) {
      // This catches unexpected errors and use case retryable errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        {
          ...logContext,
          error: errorMessage,
        },
        'Transaction processing failed - will be retried by BullMQ',
      );

      // Re-throw to let BullMQ handle retry logic
      throw error;
    }
  }
}
