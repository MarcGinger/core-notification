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
 * Property decorator for Description
 * @returns {PropertyDecorator}
 */
export function ApiTemplateDescription() {
  return applyDecorators(
    ApiProperty({
      description: `Detailed description of the template's purpose, when to use it, and any special instructions for content creators`,
      example:
        'Automated reminder sent to customers when an invoice payment is overdue. Includes payment link and support contact information.',
      type: String,
      maxLength: 255,
      required: false,
    }),
    IsString(),
    MaxLength(255),
    IsOptional(),
  );
}
