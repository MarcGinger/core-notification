/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { handleCommandError } from 'src/shared/application/commands';
import { MakerRepository } from '../../infrastructure/repositories';
import { IUserToken } from 'src/shared/auth';
import { IMaker, MakerStatusEnum } from '../../domain/entities';
import { MakerExceptionMessage } from '../../domain/exceptions';
import { LoggingErrorHelper } from 'src/shared/application/helpers';
import { MakerValidationHelper } from '../helpers';

/**
 * Use case for updating maker status with proper event sourcing.
 * Demonstrates proper use of aggregate methods for event emission.
 *
 * This implementation showcases:
 * - Proper separation of concerns between application and domain layers
 * - Direct use of aggregate methods for proper event emission
 * - Input validation at the application layer
 * - Comprehensive error handling and audit logging
 */

@Injectable()
export class UpdateMakerStatusUseCase {
  private readonly logger = new Logger(UpdateMakerStatusUseCase.name);

  constructor(private readonly repository: MakerRepository) {}
  async execute(
    user: IUserToken,
    id: string,
    status: MakerStatusEnum,
  ): Promise<IMaker> {
    try {
      // Technical validation only (null checks, types) - NO business rules
      MakerValidationHelper.validateInput(user, id);

      if (!status) {
        throw new NotFoundException(MakerExceptionMessage.statusNotFound);
      }

      LoggingErrorHelper.logInfo(
        this.logger,
        `Updating maker status: ${id} to ${status}`,
        user,
      );

      const aggregate = await this.repository.getById(user, id);
      if (!aggregate) {
        throw new NotFoundException(MakerExceptionMessage.notFound);
      }

      // Always call aggregate method - it handles ALL business logic including idempotent updates
      aggregate.updateStatus(user, status);

      const result = await this.repository.saveMaker(user, aggregate);

      LoggingErrorHelper.logInfo(
        this.logger,
        `Successfully processed maker status update: ${id}`,
        user,
        {
          id,
          status,
          operation: 'UPDATE_STATUS',
          entityType: 'maker',
        },
      );

      return result;
    } catch (error) {
      LoggingErrorHelper.logError(
        this.logger,
        `Failed to update maker status: ${id}`,
        user,
        error,
        {
          id,
          status,
          operation: 'UPDATE_STATUS',
          entityType: 'maker',
        },
      );

      handleCommandError(
        error,
        MakerExceptionMessage.notFound,
        MakerExceptionMessage.updateError,
      );
      throw error;
    }
  }
}
