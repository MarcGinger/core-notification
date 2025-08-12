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
  ListMakerOrderEnum,
  ListMakerProps,
  ListMakerPropsOptions,
} from '../../domain/properties';
import { MakerStatusEnum } from '../../domain/entities';
import {
  ApiMakerAmount,
  ApiMakerCorrelationId,
  ApiMakerDescription,
  ApiMakerFrom,
  ApiMakerId,
  ApiMakerList,
  ApiMakerListMeta,
  ApiMakerListOrderBy,
  ApiMakerScheduledAt,
  ApiMakerStatus,
  ApiMakerTo,
} from './decorators';

/**
 * Maker list response DTO
 */
export class MakerListResponse implements ListMakerProps {
  @ApiMakerId({ required: true })
  readonly id: string;

  @ApiMakerFrom({ required: true })
  readonly from: string;

  @ApiMakerTo({ required: true })
  readonly to: string;

  @ApiMakerDescription()
  readonly description?: string;

  @ApiMakerAmount({ required: true })
  readonly amount: Date;

  @ApiMakerStatus()
  readonly status?: MakerStatusEnum;

  @ApiMakerScheduledAt()
  readonly scheduledAt?: Date;

  @ApiMakerCorrelationId()
  readonly correlationId?: string;
}

/**
 * Maker list request DTO with filtering options
 * Based on table indexes for filterable fields
 */
export class MakerListRequest
  extends ListOptionResponse
  implements ListMakerPropsOptions
{
  @ApiMakerTo({ required: false })
  readonly to?: string;

  @ApiMakerListOrderBy()
  readonly orderBy?: ListMakerOrderEnum;
}

/**
 * Maker page response DTO with metadata for pagination
 */
export class MakerPageResponse {
  @ApiMakerList(MakerListResponse)
  readonly data: MakerListResponse[];

  @ApiMakerListMeta()
  readonly meta: ListMetaResponse;
}
