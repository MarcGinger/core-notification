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
import { IsObject, IsOptional } from 'class-validator';

/**
 * Property decorator for Payload
 * @returns {PropertyDecorator}
 */
export function ApiMessagePayload() {
  return applyDecorators(
    ApiProperty({
      description: `The original data payload that was provided when the message was requested, used for template rendering and audit purposes.`,
      example:
        '{"customer": {"name": "John Doe", "id": "12345"}, "payment": {"amount": 150.00, "status": "completed", "id": "pay_123"}}',
      type: String,
      required: false,
    }),
    IsObject(),
    IsOptional(),
  );
}
