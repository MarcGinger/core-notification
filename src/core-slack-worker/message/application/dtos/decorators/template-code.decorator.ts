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
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Property decorator for TemplateCode
 * @returns {PropertyDecorator}
 */
export function ApiMessageTemplateCode() {
  return applyDecorators(
    ApiProperty({
      description: `Reference to the template code that was used to render the final message content.`,
      example: 'payment-alert-template',
      type: String,
      maxLength: 60,
      required: false,
    }),
    IsString(),
    MaxLength(60),
    IsOptional(),
  );
}
