/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ITransaction } from '../../domain';
import {
  ApiTransactionAmount,
  ApiTransactionFrom,
  ApiTransactionId,
  ApiTransactionScheduledAt,
  ApiTransactionTo,
} from './decorators';

/**
 * Transaction response DTO
 */
export class TransactionResponse implements ITransaction {
  @ApiTransactionId({ required: true })
  readonly id: string;

  @ApiTransactionFrom({ required: true })
  readonly from: string;

  @ApiTransactionTo({ required: true })
  readonly to: string;

  @ApiTransactionAmount({ required: true })
  readonly amount: number;

  @ApiTransactionScheduledAt()
  readonly scheduledAt?: Date;
}
