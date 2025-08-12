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
import { IMaker } from '../../domain/entities';
import { Maker } from '../../domain/aggregates';
import { MakerExceptionMessage } from '../../domain/exceptions';
import { UpdateMakerProps } from '../../domain/properties';
import { CoreMakerLoggingHelper } from '../../../shared/domain/value-objects';
import { MakerValidationHelper } from '../helpers';

/**
 * Interface for field change tracking
 */
interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Interface for update operation summary
 */
interface UpdateSummary {
  fieldsUpdated: string[];
  eventsEmitted: number;
  changesSummary: string;
  totalChanges: number;
}

/**
 * Use case for updating maker information with proper event sourcing.
 * Demonstrates proper use of aggregate methods for event emission.
 *
 * This implementation showcases:
 * - Proper separation of concerns between application and domain layers
 * - Direct use of aggregate update methods for proper event emission
 * - Enhanced error handling with business context
 * - Input validation at the application layer
 */
@Injectable()
export class UpdateMakerUseCase {
  private readonly logger = new Logger(UpdateMakerUseCase.name);

  constructor(private readonly repository: MakerRepository) {}

  /**
   * Updates maker information with proper domain validation
   * Production-optimized with smart logging strategy
   * @param user - The user performing the operation
   * @param id - The maker identifier
   * @param props - The update properties
   * @returns Promise<IMaker> - The updated maker DTO
   * @throws NotFoundException - When maker is not found
   * @throws MakerExceptionMessage - When business rules prevent the operation
   */
  async execute(
    user: IUserToken,
    id: string,
    props: UpdateMakerProps,
  ): Promise<IMaker> {
    // Single operation start log with all context
    const operationContext = CoreMakerLoggingHelper.createEnhancedLogContext(
      'UpdateMakerUseCase',
      'execute',
      id,
      user,
      {
        operation: 'UPDATE',
        entityType: 'maker',
        requestedFields: Object.keys(props || {}),
        fieldCount: Object.keys(props || {}).length,
      },
    );

    this.logger.log(operationContext, `Starting maker update: ${id}`);

    try {
      // Input validation for technical concerns only
      // Input validation (no logging unless error)
      MakerValidationHelper.validateInput(user, id);
      if (!props) {
        throw new BadRequestException(
          MakerExceptionMessage.propsRequiredToUpdateMaker,
        );
      }

      // Retrieve aggregate (no logging unless error)
      const aggregate = await this.repository.getById(user, id);
      if (!aggregate) {
        throw new NotFoundException(MakerExceptionMessage.notFound);
      }

      // Single update operation with summary logging
      const updateSummary = this.performUpdate(user, aggregate, props);

      // Persist the changes
      const result = await this.repository.saveMaker(user, aggregate);

      // Single success log with comprehensive summary
      const successContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'UpdateMakerUseCase',
        'execute',
        id,
        user,
        {
          operation: 'UPDATE',
          entityType: 'maker',
          phase: 'SUCCESS',
          fieldsUpdated: updateSummary.fieldsUpdated,
          eventsEmitted: updateSummary.eventsEmitted,
          changesSummary: updateSummary.changesSummary,
          totalChanges: updateSummary.totalChanges,
        },
      );

      this.logger.log(
        successContext,
        `Maker updated successfully: ${id} [${updateSummary.changesSummary}]`,
      );

      return result;
    } catch (error) {
      // Single error log with context
      const errorContext = CoreMakerLoggingHelper.createEnhancedLogContext(
        'UpdateMakerUseCase',
        'execute',
        id,
        user,
        {
          operation: 'UPDATE',
          entityType: 'maker',
          phase: 'ERROR',
          errorType:
            error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          requestedFields: Object.keys(props || {}),
        },
      );

      this.logger.error(errorContext, `Maker update failed: ${id}`);

      handleCommandError(
        error,
        MakerExceptionMessage.notFound,
        MakerExceptionMessage.updateError,
      );
      throw error;
    }
  }

  /**
   * Performs the update operation using aggregate methods for proper event emission.
   * Returns comprehensive summary for single log entry instead of verbose logging.
   * Each update method on the aggregate emits MakerUpdatedEvent automatically.
   */
  private performUpdate(
    user: IUserToken,
    aggregate: Maker,
    props: UpdateMakerProps,
  ): UpdateSummary {
    const changes: FieldChange[] = [];

    // Batch all updates without individual logging

    // Handle status updates
    if (props.status !== undefined && aggregate.updateStatus) {
      const oldValue = aggregate.status;
      aggregate.updateStatus(user, props.status);
      changes.push({ field: 'status', oldValue, newValue: props.status });
    }

    if (props.from !== undefined) {
      const oldValue = aggregate.from;
      aggregate.updateFrom(user, props.from);
      changes.push({ field: 'from', oldValue, newValue: props.from });
    }

    if (props.to !== undefined) {
      const oldValue = aggregate.to;
      aggregate.updateTo(user, props.to);
      changes.push({ field: 'to', oldValue, newValue: props.to });
    }

    if (props.description !== undefined) {
      const oldValue = aggregate.description;
      aggregate.updateDescription(user, props.description);
      changes.push({
        field: 'description',
        oldValue,
        newValue: props.description,
      });
    }

    if (props.scheduledAt !== undefined) {
      const oldValue = aggregate.scheduledAt;
      aggregate.updateScheduledAt(user, props.scheduledAt);
      changes.push({
        field: 'scheduledAt',
        oldValue,
        newValue: props.scheduledAt,
      });
    }

    if (props.correlationId !== undefined) {
      const oldValue = aggregate.correlationId;
      aggregate.updateCorrelationId(user, props.correlationId);
      changes.push({
        field: 'correlationId',
        oldValue,
        newValue: props.correlationId,
      });
    }

    // Return summary instead of logging
    return {
      fieldsUpdated: changes.map((c) => c.field),
      eventsEmitted: aggregate.getUncommittedEvents().length,
      changesSummary: this.createChangesSummary(changes),
      totalChanges: changes.length,
    };
    // For complex dependencies, we need to resolve them first
    // These would require dependency resolution similar to create use case
  }

  /**
   * Create concise summary of changes for logging
   * Format: field1:oldValue->newValue,field2:oldValue->newValue
   */
  private createChangesSummary(changes: FieldChange[]): string {
    if (changes.length === 0) return 'no_changes';

    return changes
      .map(
        (c) =>
          `${c.field}:${this.formatValue(c.oldValue)}->${this.formatValue(c.newValue)}`,
      )
      .join(',');
  }

  /**
   * Format values for concise logging (truncate long strings, handle nulls)
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string' && value.length > 20) {
      return `${value.substring(0, 17)}...`;
    }
    return String(value);
  }
}
