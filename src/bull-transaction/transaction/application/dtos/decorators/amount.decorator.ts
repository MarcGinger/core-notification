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
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for Amount with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiTransactionAmount(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({ description: ``, type: Number, required }),
    IsNumber(),
    required ? IsNotEmpty() : IsOptional(),
  );
}
