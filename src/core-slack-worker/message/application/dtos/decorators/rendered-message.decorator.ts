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
 * Property decorator for RenderedMessage
 * @returns {PropertyDecorator}
 */
export function ApiMessageRenderedMessage() {
  return applyDecorators(
    ApiProperty({
      description: `The final rendered message content after template processing, exactly as it was sent to Slack.`,
      example:
        '🔔 **Payment Alert**\\n\\nCustomer: John Doe\\nAmount: $150.00\\nStatus: completed',
      type: String,
      required: false,
    }),
    IsString(),
    IsOptional(),
  );
}
