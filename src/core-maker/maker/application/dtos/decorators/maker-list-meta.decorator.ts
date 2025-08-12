/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ListMetaResponse } from 'src/shared/application/dtos';

/**
 * Property decorator for meta information in Maker page responses
 * @returns PropertyDecorator
 */
export function ApiMakerListMeta() {
  return applyDecorators(
    ApiProperty({
      type: () => ListMetaResponse,
    }),
    Type(() => ListMetaResponse),
  );
}
