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
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for ContentUrl with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiTemplateContentUrl(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `URL to retrieve the template content from blob storage. Used for large templates or when content contains binary data like images`,
      example:
        'https://gstudios.blob.core.windows.net/private/core/templates/slack/generic/slack-invoice-reminder/v3.json',
      type: String,
      required,
    }),
    IsString(),
    required ? IsNotEmpty() : IsOptional(),
  );
}
