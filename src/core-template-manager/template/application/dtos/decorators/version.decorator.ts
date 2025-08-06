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
import { IsNumber, IsOptional } from 'class-validator';

/**
 * Property decorator for Version
 * @returns {PropertyDecorator}
 */
export function ApiTemplateVersion() {
  return applyDecorators(
    ApiProperty({
      description: `Semantic version number for the template, incremented when content or schema changes. Enables rollback and A/B testing capabilities`,
      type: Number,
      required: false,
    }),
    IsNumber(),
    IsOptional(),
  );
}
