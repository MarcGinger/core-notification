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
 * Property decorator for Content with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiTemplateContent(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `Template content with placeholders for dynamic data. Format varies by transport (HTML for email, JSON for Slack blocks, plain text for SMS). Stored in blob storage for large templates.`,
      example:
        'Hi {{customer.name}}, your invoice #{{invoice.number}} for ${{invoice.amount}} is now {{invoice.days_overdue}} days overdue. Please pay by clicking {{payment.link}}',
      type: String,
      required,
    }),
    IsString(),
    required ? IsNotEmpty() : IsOptional(),
  );
}
