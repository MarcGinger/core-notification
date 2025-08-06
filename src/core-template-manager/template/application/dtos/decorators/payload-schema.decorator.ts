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
import { IsNotEmpty, IsObject, IsOptional } from 'class-validator';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for PayloadSchema with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiTemplatePayloadSchema(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `JSON Schema definition for validating payload data before template rendering. Ensures data integrity and provides documentation for required fields`,
      example: {
        type: 'object',
        properties: {
          customer: {
            type: 'object',
            properties: { name: { type: 'string' } },
          },
          invoice: {
            type: 'object',
            properties: {
              number: { type: 'string' },
              amount: { type: 'number' },
              days_overdue: { type: 'integer' },
            },
          },
          payment: {
            type: 'object',
            properties: { link: { type: 'string', format: 'uri' } },
          },
        },
        required: ['customer', 'invoice', 'payment'],
      },
      type: String,
      required,
    }),
    IsObject(),
    required ? IsNotEmpty() : IsOptional(),
  );
}
