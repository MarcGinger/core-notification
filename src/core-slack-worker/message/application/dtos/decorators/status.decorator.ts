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
import { MessageStatusEnum } from '../../../domain/entities';

/**
 * Options for property decorators
 */
interface PropOptions {
  required?: boolean;
}
/**
 * Property decorator for Status with required option
 * @param {Object} options - Options for the decorator
 * @returns {PropertyDecorator}
 */
export function ApiMessageStatus(options: PropOptions = {}) {
  const { required = true } = options;
  return applyDecorators(
    ApiProperty({
      description: `Current delivery status of the message. Possible values: PENDING, SCHEDULED, SUCCESS, FAILED, RETRYING.`,
      example: 'pending',
      type: String,
      enum: MessageStatusEnum,
      required,
    }),
    IsEnum(MessageStatusEnum),
    required ? IsNotEmpty() : IsOptional(),
  );
}
