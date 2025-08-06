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
import { IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for CreatedAt with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiMessageCreatedAt(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `Timestamp with time zone when the message record was initially created in the system.`,
      example: '2025-08-01T10:00:00Z',
      type: String,
      format: 'date-time',
      required,
    }),
    required ? IsNotEmpty() : IsOptional(),
  );
}
