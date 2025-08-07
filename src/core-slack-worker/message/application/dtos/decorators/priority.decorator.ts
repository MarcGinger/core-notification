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
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}

/**
 * Property decorator for Priority number with nullable option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiMessagePriority(options: PropOptions = {}) {
  const { required = false } = options;
  return applyDecorators(
    ApiProperty({
      description: `Priority level for the message, ranging from 1 (highest) to 20 (lowest). Higher numbers indicate lower priority.`,
      example: 5,
      type: Number,
      minimum: 1,
      maximum: 20,
      required,
      nullable: true,
    }),
    IsOptional(),
    IsInt(),
    Min(1),
    Max(20),
  );
}
