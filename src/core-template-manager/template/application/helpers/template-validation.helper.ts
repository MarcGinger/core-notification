/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { TemplateExceptionMessage } from '../../domain/exceptions';

/**
 * Shared validation helper for Template domain use cases.
 * Handles ONLY pure technical validation (null checks, type validation, format validation).
 * Business rules like "valid status values" or "valid property structures" are enforced by domain aggregates.
 */
export class TemplateValidationHelper {
  static validateInput(user: IUserToken, code: string): void {
    if (!user) {
      throw new UnauthorizedException(
        TemplateExceptionMessage.TemplateUserRequired,
      );
    }

    if (!code || typeof code !== 'string' || code.trim() === '') {
      throw new BadRequestException(
        TemplateExceptionMessage.codeRequiredTemplate,
      );
    }

    // Note: Business rules like "template exists" and "idempotent enable/disable logic"
    // are enforced by the Template aggregate's enable() / disable() method
  }
}
