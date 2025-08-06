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
import { IsOptional, IsString } from 'class-validator';

/**
 * Property decorator for FailureReason
 * @returns {PropertyDecorator}
 */
export function ApiMessageFailureReason() {
  return applyDecorators(
    ApiProperty({
      description: `Detailed error message or reason if the message delivery failed. Null for successful deliveries.`,
      example: 'Slack API rate limit exceeded. Will retry in 60 seconds.',
      type: String,
      required: false,
    }),
    IsString(),
    IsOptional(),
  );
}
