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
import { MakerExceptionMessage } from '../../domain/exceptions';

/**
 * Shared validation helper for Maker domain use cases.
 * Handles ONLY pure technical validation (null checks, type validation, format validation).
 * Business rules like "valid status values" or "valid property structures" are enforced by domain aggregates.
 */
export class MakerValidationHelper {
  static validateInput(user: IUserToken, id: string): void {
    if (!user) {
      throw new UnauthorizedException(MakerExceptionMessage.MakerUserRequired);
    }

    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new BadRequestException(MakerExceptionMessage.idRequiredMaker);
    }

    // Note: Business rules like "maker exists" and "idempotent enable/disable logic"
    // are enforced by the Maker aggregate's enable() / disable() method
  }
}
