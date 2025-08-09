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
import { IsEnum, IsOptional } from 'class-validator';
import { ListTransactionOrderEnum } from '../../../domain/properties';

/**
 * Property decorator for OrderBy field in Transaction list requests
 * @returns PropertyDecorator
 */
export function ApiTransactionListOrderBy() {
  return applyDecorators(
    ApiProperty({
      enum: ListTransactionOrderEnum,
      required: false,
      description: 'Order by field',
    }),
    IsEnum(ListTransactionOrderEnum),
    IsOptional(),
  );
}
