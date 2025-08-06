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
 * Context information for saga operations
 * Provides tracking and idempotency for distributed transactions
 */
export interface ISagaContext {
  /** Unique identifier for the saga instance */
  sagaId: string;
  /** Correlation identifier to track related operations across services */
  correlationId: string;
  /** Unique identifier for this specific operation within the saga */
  operationId: string;
  /** Indicates if this is a retry attempt */
  isRetry?: boolean;
}
