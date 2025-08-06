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
 * Property decorator for SentAt
 * @returns {PropertyDecorator}
 */
export function ApiMessageSentAt() {
  return applyDecorators(
    ApiProperty({
      description: `Timestamp when the message was successfully delivered to Slack. Null if not yet sent or failed.`,
      example: '2025-08-01T10:15:23Z',
      type: String,
      format: 'date-time',
      required: false,
    }),
    IsOptional(),
  );
}
