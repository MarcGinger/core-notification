/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  ListMetaResponse,
  ListOptionResponse,
} from 'src/shared/application/dtos';
import {
  ListTransactionOrderEnum,
  ListTransactionProps,
  ListTransactionPropsOptions,
} from '../../domain/properties';
import {
  ApiTransactionAmount,
  ApiTransactionFrom,
  ApiTransactionId,
  ApiTransactionList,
  ApiTransactionListMeta,
  ApiTransactionListOrderBy,
  ApiTransactionScheduledAt,
  ApiTransactionTo,
} from './decorators';

/**
 * Transaction list response DTO
 */
export class TransactionListResponse implements ListTransactionProps {
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

/**
 * Transaction list request DTO with filtering options
 * Based on table indexes for filterable fields
 */
export class TransactionListRequest
  extends ListOptionResponse
  implements ListTransactionPropsOptions
{
  @ApiTransactionListOrderBy()
  readonly orderBy?: ListTransactionOrderEnum;
}

/**
 * Transaction page response DTO with metadata for pagination
 */
export class TransactionPageResponse {
  @ApiTransactionList(TransactionListResponse)
  readonly data: TransactionListResponse[];

  @ApiTransactionListMeta()
  readonly meta: ListMetaResponse;
}
