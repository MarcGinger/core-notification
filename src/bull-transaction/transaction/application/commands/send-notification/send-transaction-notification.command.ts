/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from 'src/shared/auth';
import { ITransaction } from '../../../domain/entities';

export class SendTransactionNotificationCommand {
  constructor(
    public readonly transaction: ITransaction,
    public readonly user: IUserToken,
    public readonly action: 'created' | 'updated' | 'completed' | 'failed',
    public readonly options?: {
      priority?: number;
      messageType?: 'notification' | 'slack' | 'email';
      additionalData?: Record<string, any>;
    },
  ) {}
}
