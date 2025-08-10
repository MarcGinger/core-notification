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
import { TransactionApiAdapter } from 'src/bull-transaction/transaction/infrastructure/adapters';
import { ILogger } from 'src/shared/logger';
import {
  AdapterProcessRequest,
  AdapterProcessResponse,
  IMessageProcessingAdapter,
} from './adapter.interface';

/**
 * Message processing adapter for transaction-related messages
 * Acts as a bridge between the message queue system and TransactionApiAdapter
 * Implements the common IMessageProcessingAdapter interface
 */
@Injectable()
export class TransactionMessageAdapter implements IMessageProcessingAdapter {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly transactionApiAdapter: TransactionApiAdapter,
  ) {}

  /**
   * Process a transaction message by delegating to TransactionApiAdapter
   */
  async processMessage(
    request: AdapterProcessRequest,
  ): Promise<AdapterProcessResponse> {
    this.logger.debug(
      {
        transactionId: request.transactionId,
        operationType: request.operationType,
        amount: request.amount,
        currency: request.currency,
        tenant: request.tenant,
        userId: request.userId,
      },
      'Processing transaction message via TransactionMessageAdapter',
    );

    try {
      // Validate transaction-specific fields
      if (!request.transactionId || !request.operationType || !request.amount) {
        return {
          success: false,
          error:
            'Missing required transaction fields: transactionId, operationType, or amount',
        };
      }

      // Convert to transaction-specific request format
      const transactionRequest = {
        transactionId: request.transactionId,
        operationType: request.operationType,
        amount: request.amount,
        currency: request.currency || 'USD',
        fromAccount: request.fromAccount,
        toAccount: request.toAccount,
        description: request.description,
        metadata: {
          ...request.metadata,
          tenant: request.tenant,
          userId: request.userId,
          correlationId: request.correlationId,
        },
      };

      // Process via TransactionApiAdapter
      const response =
        await this.transactionApiAdapter.processTransaction(transactionRequest);

      this.logger.debug(
        {
          transactionId: request.transactionId,
          success: response.success,
          status: response.status,
        },
        'Transaction processing completed',
      );

      // Convert to common response format
      return {
        success: response.success,
        timestamp: response.timestamp || new Date().toISOString(),
        transactionId: response.transactionId,
        error: response.error,
        metadata: {
          status: response.status,
          processingResult: response.processingResult,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        {
          transactionId: request.transactionId,
          error: errorMessage,
        },
        'Failed to process transaction message',
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if this adapter can handle the given config code
   * Handles transaction-related config codes
   */
  canHandle(configCode: string): boolean {
    // Define transaction config codes that this adapter can handle
    const transactionConfigCodes = [
      'transaction-processing',
      'transaction-notification',
      'transaction-alert',
      'transaction-update',
      'payment-processing',
      'withdrawal-processing',
      'deposit-processing',
      'transfer-processing',
    ];

    return transactionConfigCodes.includes(configCode.toLowerCase());
  }
}
