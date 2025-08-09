/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { TransactionStatusEnum } from '../entities';
import { TransactionIdentifier } from '../value-objects';

// generate-domain-properties
export interface TransactionProps {
  readonly id: TransactionIdentifier;
  readonly from: string;
  readonly to: string;
  readonly amount: number;
  readonly status: TransactionStatusEnum;
  readonly scheduledAt?: Date;
  readonly processedAt?: Date;
  readonly failureReason?: string;
  readonly correlationId?: string;
  readonly retryCount: number;
  readonly priority?: number;
}
