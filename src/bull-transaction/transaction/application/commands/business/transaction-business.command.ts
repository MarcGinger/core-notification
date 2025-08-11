/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from '../../../../../shared/auth/user-token.interface';

/**
 * Transaction-specific commands (business intent)
 * These live in the transaction domain and express business actions
 * Following COPILOT_INSTRUCTIONS.md with user context for traceability
 */

export class InitiateTransferCommand {
  constructor(
    public readonly fromAccount: string,
    public readonly toAccount: string,
    public readonly amount: number,
    public readonly user: IUserToken,
    public readonly currency: string = 'USD',
    public readonly correlationId: string = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ) {}
}

export class RefundPaymentCommand {
  constructor(
    public readonly transactionId: string,
    public readonly reason: string,
    public readonly user: IUserToken,
    public readonly amount?: number, // Optional for partial refunds
    public readonly correlationId: string = `refund-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ) {}
}

export class ValidateTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly rules: string[],
    public readonly user: IUserToken,
    public readonly correlationId: string = `validate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ) {}
}
