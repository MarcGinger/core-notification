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
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for Id with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiMessageId(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `Unique identifier for the message record, typically a UUID generated when the message is initially created.`,
      example: '550e8400-e29b-41d4-a716-446655440000',
      type: String,
      required,
    }),
    IsString(),
    required ? IsNotEmpty() : IsOptional(),
  );
}
