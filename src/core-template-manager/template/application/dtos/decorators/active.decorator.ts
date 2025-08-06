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
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Property decorator for Active
 * @returns {PropertyDecorator}
 */
export function ApiTemplateActive() {
  return applyDecorators(
    ApiProperty({
      description: `Indicates whether the template is currently available for use. Inactive templates are retained for audit purposes but cannot be used for new messages`,
      example: true,
      type: Boolean,
      required: false,
    }),
    IsBoolean(),
    IsOptional(),
  );
}
