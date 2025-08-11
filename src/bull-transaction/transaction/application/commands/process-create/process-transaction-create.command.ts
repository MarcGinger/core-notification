/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from 'src/shared/auth/user-token.interface';
import { UpdateTransactionProps } from '../../../domain/properties';

/**
 * Transaction-specific commands (business intent)
 * These live in the transaction domain and express business actions
 * Following COPILOT_INSTRUCTIONS.md with user context for traceability
 */

export class ProcessTransactionCreateCommand {
  constructor(
    public user: IUserToken,
    public readonly props: UpdateTransactionProps,
  ) {}
}
