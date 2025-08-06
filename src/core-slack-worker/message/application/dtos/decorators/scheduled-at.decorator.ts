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
import { IsOptional } from 'class-validator';

/**
 * Property decorator for ScheduledAt
 * @returns {PropertyDecorator}
 */
export function ApiMessageScheduledAt() {
  return applyDecorators(
    ApiProperty({
      description: `Optional timestamp when the message is scheduled to be delivered. Null for immediate delivery messages.`,
      example: '2025-08-01T15:30:00Z',
      type: String,
      format: 'date-time',
      required: false,
    }),
    IsOptional(),
  );
}
