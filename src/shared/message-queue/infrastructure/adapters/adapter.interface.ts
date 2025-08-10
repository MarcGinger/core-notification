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
 * Common response interface for all message processing adapters
 */
export interface AdapterProcessResponse {
  success: boolean;
  timestamp?: string;
  channel?: string;
  transactionId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Common request interface for all message processing adapters
 */
export interface AdapterProcessRequest {
  // Common fields
  tenant?: string;
  userId?: string;
  correlationId?: string;

  // Message-specific fields (for Slack)
  channel?: string;
  text?: string;
  botToken?: string;

  // Transaction-specific fields
  transactionId?: string;
  operationType?: 'withdrawal' | 'deposit' | 'transfer';
  amount?: number;
  currency?: string;
  fromAccount?: string;
  toAccount?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for message processing adapters
 * Allows polymorphic handling of different message types
 */
export interface IMessageProcessingAdapter {
  /**
   * Process a message/transaction based on the request type
   */
  processMessage(
    request: AdapterProcessRequest,
  ): Promise<AdapterProcessResponse>;

  /**
   * Check if this adapter can handle the given config code
   */
  canHandle(configCode: string): boolean;
}
