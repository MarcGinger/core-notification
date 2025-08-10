/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import {
  CreateTransactionCommand,
  SendTransactionNotificationCommand,
} from '../../application/commands';
import { ITransaction } from '../../domain/entities';
import { CreateTransactionProps } from '../../domain/properties';

export interface ProcessTransactionRequest {
  id: string;
  operationType: 'withdrawal' | 'deposit' | 'transfer';
  amount: number;
  currency: string;
  fromAccount?: string;
  toAccount?: string;
  description?: string;
  metadata?: Record<string, any>;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface ProcessTransactionResult {
  success: boolean;
  status?: 'completed' | 'pending' | 'failed';
  processingResult?: {
    transactionFee: number;
    exchangeRate?: number;
    processedAmount: number;
    externalTransactionId: string;
  };
  error?: string;
  userFriendlyMessage?: string;
  isRetryable?: boolean;
}

// generate-api-service

@Injectable()
export class TransactionApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {}

  async create(
    user: IUserToken,
    dto: CreateTransactionProps,
  ): Promise<ITransaction> {
    const entity = await this.commandBus.execute<
      CreateTransactionCommand,
      ITransaction
    >(new CreateTransactionCommand(user, dto));

    // Send notification via command bus (proper CQRS pattern)
    await this.commandBus.execute(
      new SendTransactionNotificationCommand(entity, user, 'created'),
    );

    return entity;
  }

  async processTransaction(
    user: IUserToken,
    request: ProcessTransactionRequest,
  ): Promise<ProcessTransactionResult> {
    const logContext = {
      component: 'TransactionApplicationService',
      method: 'processTransaction',
      transactionId: request.id,
      operationType: request.operationType,
      amount: request.amount,
      currency: request.currency,
      tenant: user.tenant,
      userId: user.sub,
    };

    this.logger.log(logContext, 'Processing transaction request');

    try {
      // Validate transaction request
      this.validateTransactionRequest(request);

      // Simulate external API processing
      const mockResult =
        await this.simulateExternalTransactionProcessing(request);

      if (mockResult.success) {
        this.logger.log(
          {
            ...logContext,
            externalTransactionId: mockResult.transactionId,
            processingFee: mockResult.fee,
          },
          'Transaction processed successfully',
        );

        return {
          success: true,
          status: 'completed',
          processingResult: {
            transactionFee: mockResult.fee,
            exchangeRate: mockResult.exchangeRate,
            processedAmount: mockResult.processedAmount,
            externalTransactionId: mockResult.transactionId,
          },
        };
      } else {
        // Handle API failure
        const isRetryable = this.isErrorRetryable(mockResult.error);

        this.logger.error(
          {
            ...logContext,
            error: mockResult.error,
            isRetryable,
          },
          'Transaction processing failed',
        );

        return {
          success: false,
          status: 'failed',
          error: mockResult.error,
          userFriendlyMessage: this.getUserFriendlyMessage(mockResult.error),
          isRetryable,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = this.isErrorRetryable(errorMessage);

      this.logger.error(
        {
          ...logContext,
          error: errorMessage,
          isRetryable,
        },
        'Unexpected error during transaction processing',
      );

      return {
        success: false,
        status: 'failed',
        error: errorMessage,
        userFriendlyMessage:
          'An unexpected error occurred while processing the transaction',
        isRetryable,
      };
    }
  }

  private async simulateExternalTransactionProcessing(
    request: ProcessTransactionRequest,
  ) {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock fee calculation
    const baseFee = request.amount * 0.02; // 2% fee
    const exchangeRate = request.currency === 'USD' ? 1 : 0.85; // Mock EUR rate

    return {
      success: true,
      transactionId: `ext-${request.id}-${Date.now()}`,
      fee: baseFee,
      exchangeRate,
      processedAmount: request.amount * exchangeRate,
      error: '',
    };
  }

  private validateTransactionRequest(request: ProcessTransactionRequest): void {
    if (!request.id) {
      throw new Error('Transaction ID is required');
    }

    if (!request.operationType) {
      throw new Error('Operation type is required');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('Valid amount is required');
    }

    if (!request.currency) {
      throw new Error('Currency is required');
    }

    if (request.operationType === 'transfer') {
      if (!request.fromAccount || !request.toAccount) {
        throw new Error(
          'Transfer operations require both fromAccount and toAccount',
        );
      }
    }
  }

  private isErrorRetryable(error: string): boolean {
    // Network errors, timeouts, and temporary service unavailable errors are retryable
    const retryableErrorPatterns = [
      'network',
      'timeout',
      'unavailable',
      'rate limit',
      'service busy',
      'connection',
      'temporary',
    ];

    const lowerError = error.toLowerCase();
    return retryableErrorPatterns.some((pattern) =>
      lowerError.includes(pattern),
    );
  }

  private getUserFriendlyMessage(error: string): string {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('insufficient')) {
      return 'Insufficient funds for this transaction';
    }

    if (lowerError.includes('invalid account')) {
      return 'Invalid account information provided';
    }

    if (
      lowerError.includes('rate limit') ||
      lowerError.includes('service busy')
    ) {
      return 'Service is temporarily busy, please try again';
    }

    if (lowerError.includes('network') || lowerError.includes('timeout')) {
      return 'Network connection issue, please try again';
    }

    return 'Transaction could not be processed at this time';
  }
}
