/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IMaker, MakerStatusEnum } from '../../domain';
import {
  ApiMakerCorrelationId,
  ApiMakerDescription,
  ApiMakerFrom,
  ApiMakerId,
  ApiMakerScheduledAt,
  ApiMakerStatus,
  ApiMakerTo,
} from './decorators';

/**
 * Maker response DTO
 */
export class MakerResponse implements IMaker {
  @ApiMakerId({ required: true })
  readonly id: string;

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
