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
import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Property decorator for data array in Transaction page responses
 * @param responseType - The response type class to use for validation and Swagger
 * @returns PropertyDecorator
 */
export function ApiTransactionList(responseType?: any) {
  const decorators = [
    ApiProperty({
      type: responseType || Object,
      isArray: true,
      description: 'Array of transaction list items',
    }),
    IsArray(),
  ];

  // Only add nested validation and type transformation if responseType is defined
  if (responseType) {
    decorators.push(ApiExtraModels(responseType));
    decorators.push(Type(() => responseType));
    decorators.push(ValidateNested({ each: true }));
  }

  return applyDecorators(...decorators);
}
