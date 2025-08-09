/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateTransactionProps } from '../../domain/properties';
import {
  ApiTransactionAmount,
  ApiTransactionFrom,
  ApiTransactionScheduledAt,
  ApiTransactionTo,
} from './decorators';

/**
 * Transaction create request DTO
 */
export class TransactionCreateRequest implements CreateTransactionProps {
  @ApiTransactionFrom({ required: true })
  readonly from: string;

  @ApiTransactionTo({ required: true })
  readonly to: string;

  @ApiTransactionAmount({ required: true })
  readonly amount: number;

  @ApiTransactionScheduledAt()
  readonly scheduledAt?: Date;
}
