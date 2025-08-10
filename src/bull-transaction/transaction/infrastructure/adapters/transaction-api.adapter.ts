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
import { ILogger } from 'src/shared/logger';

/**
 * Request data for processing a transaction
 */
export interface TransactionApiProcessRequest {
  transactionId: string;
  operationType: 'withdrawal' | 'deposit' | 'transfer';
  amount: number;
  currency: string;
  fromAccount?: string;
  toAccount?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Response from Transaction Processing API
 */
export interface TransactionApiProcessResponse {
  success: boolean;
  timestamp?: string;
  transactionId?: string;
  status?: 'processed' | 'failed' | 'pending';
  error?: string;
  processingResult?: {
    balanceAfter?: number;
    fees?: number;
    reference?: string;
  };
}

/**
 * Transaction API response type for processing operations
 */
interface TransactionApiProcessingResponse {
  ok: boolean;
  transactionId?: string;
  status?: string;
  result?: {
    balanceAfter?: number;
    fees?: number;
    reference?: string;
  };
  error?: string;
}

/**
 * Infrastructure adapter for Transaction Processing API
 * Handles all technical concerns of communicating with external transaction services
 * Contains no business logic - only technical integration
 */
@Injectable()
export class TransactionApiAdapter {
  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  /**
   * Process a transaction via external API
   * Pure technical integration - no business logic
   */
  async processTransaction(
    request: TransactionApiProcessRequest,
  ): Promise<TransactionApiProcessResponse> {
    this.logger.debug(
      {
        transactionId: request.transactionId,
        operationType: request.operationType,
        amount: request.amount,
        currency: request.currency,
      },
      'Processing transaction via external API',
    );

    // For demo purposes, we'll simulate API calls
    // In a real implementation, this would call external services like:
    // - Banking APIs (SWIFT, ACH, etc.)
    // - Payment processors (Stripe, PayPal, etc.)
    // - Internal accounting systems
    // - Blockchain networks

    try {
      // Simulate different processing scenarios based on operation type
      const processingResult =
        await this.simulateTransactionProcessing(request);

      this.logger.debug(
        {
          transactionId: request.transactionId,
          processingResult,
        },
        'Transaction API response received',
      );

      // Check if the processing was successful
      if (!processingResult.ok) {
        return {
          success: false,
          error:
            processingResult.error || 'Unknown transaction processing error',
        };
      }

      // Return successful response
      return {
        success: true,
        timestamp: new Date().toISOString(),
        transactionId: request.transactionId,
        status:
          (processingResult.status as 'processed' | 'failed' | 'pending') ||
          'processed',
        processingResult: processingResult.result,
      };
    } catch (error) {
      this.logger.error(
        {
          transactionId: request.transactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to process transaction via external API',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Simulate external transaction processing
   * In real implementation, this would make actual API calls
   */
  private async simulateTransactionProcessing(
    request: TransactionApiProcessRequest,
  ): Promise<TransactionApiProcessingResponse> {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 100 + Math.random() * 200),
    );

    // Simulate different scenarios based on amount and operation type
    const { amount, operationType, transactionId } = request;

    // Simulate failures for demo purposes
    if (amount > 10000) {
      return {
        ok: false,
        error: 'Amount exceeds transaction limit',
      };
    }

    if (transactionId.includes('fail')) {
      return {
        ok: false,
        error: 'Simulated processing failure',
      };
    }

    // Simulate successful processing
    const fees = this.calculateFees(amount, operationType);
    const balanceAfter = amount - fees; // Simplified calculation

    return {
      ok: true,
      transactionId,
      status: 'processed',
      result: {
        balanceAfter,
        fees,
        reference: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };
  }

  /**
   * Calculate processing fees (simplified)
   */
  private calculateFees(amount: number, operationType: string): number {
    const feeRates = {
      withdrawal: 0.01, // 1%
      deposit: 0.005, // 0.5%
      transfer: 0.015, // 1.5%
    };

    const rate = feeRates[operationType as keyof typeof feeRates] || 0.01;
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  }
}
