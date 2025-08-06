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
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { TemplateUseCaseEnum } from '../../../domain/entities';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for UseCase with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiTemplateUseCase(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `Business use case category for the template. Enum values: ['invoice', 'statement', 'quote', 'reminder', 'notification', 'welcome', 'confirmation', 'alert', 'report']`,
      example: 'statement',
      type: String,
      enum: TemplateUseCaseEnum,
      required,
    }),
    IsEnum(TemplateUseCaseEnum),
    required ? IsNotEmpty() : IsOptional(),
  );
}
