/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateMakerProps } from '../../domain/properties';
import { MakerStatusEnum } from '../../domain/entities';
import {
  ApiMakerCorrelationId,
  ApiMakerDescription,
  ApiMakerFrom,
  ApiMakerScheduledAt,
  ApiMakerStatus,
  ApiMakerTo,
} from './decorators';

/**
 * Maker create request DTO
 */
export class MakerCreateRequest implements CreateMakerProps {
  @ApiMakerFrom({ required: true })
  readonly from: string;

  @ApiMakerTo({ required: true })
  readonly to: string;

  @ApiMakerDescription()
  readonly description?: string;

  @ApiMakerStatus({ required: true })
  readonly status: MakerStatusEnum;

  @ApiMakerScheduledAt()
  readonly scheduledAt?: Date;

  @ApiMakerCorrelationId()
  readonly correlationId?: string;
}
