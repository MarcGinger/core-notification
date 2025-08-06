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
import { IUserToken } from 'src/shared/auth';
import { CoreTemplateManagerLoggingHelper } from '../../../shared/domain/value-objects';
import { Template } from '../../domain/aggregates';
import { ITemplate } from '../../domain/entities';
import { TemplateExceptionMessage } from '../../domain/exceptions';
import { UpdateTemplateProps } from '../../domain/properties';
import { TemplateRepository } from '../../infrastructure/repositories';
import { TemplateValidationHelper } from '../helpers';

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
 * Use case for updating template information with proper event sourcing.
 * Demonstrates proper use of aggregate methods for event emission.
 *
 * This implementation showcases:
 * - Proper separation of concerns between application and domain layers
 * - Direct use of aggregate update methods for proper event emission
 * - Enhanced error handling with business context
 * - Input validation at the application layer
 */
@Injectable()
export class UpdateTemplateUseCase {
  private readonly logger = new Logger(UpdateTemplateUseCase.name);

  constructor(private readonly repository: TemplateRepository) {}

  /**
   * Updates template information with proper domain validation
   * Production-optimized with smart logging strategy
   * @param user - The user performing the operation
   * @param code - The template identifier
   * @param props - The update properties
   * @returns Promise<ITemplate> - The updated template DTO
   * @throws NotFoundException - When template is not found
   * @throws TemplateExceptionMessage - When business rules prevent the operation
   */
  async execute(
    user: IUserToken,
    code: string,
    props: UpdateTemplateProps,
  ): Promise<ITemplate> {
    // Single operation start log with all context
    const operationContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'UpdateTemplateUseCase',
        'execute',
        code,
        user,
        {
          operation: 'UPDATE',
          entityType: 'template',
          requestedFields: Object.keys(props || {}),
          fieldCount: Object.keys(props || {}).length,
        },
      );

    this.logger.log(operationContext, `Starting template update: ${code}`);

    try {
      // Input validation for technical concerns only
      // Input validation (no logging unless error)
      TemplateValidationHelper.validateInput(user, code);
      if (!props) {
        throw new BadRequestException(
          TemplateExceptionMessage.propsRequiredToUpdateTemplate,
        );
      }

      // Retrieve aggregate (no logging unless error)
      const aggregate = await this.repository.getById(user, code);
      if (!aggregate) {
        throw new NotFoundException(TemplateExceptionMessage.notFound);
      }

      // Single update operation with summary logging
      const updateSummary = this.performUpdate(user, aggregate, props);

      // Persist the changes
      const result = await this.repository.saveTemplate(user, aggregate);

      // Single success log with comprehensive summary
      const successContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'UpdateTemplateUseCase',
          'execute',
          code,
          user,
          {
            operation: 'UPDATE',
            entityType: 'template',
            phase: 'SUCCESS',
            fieldsUpdated: updateSummary.fieldsUpdated,
            eventsEmitted: updateSummary.eventsEmitted,
            changesSummary: updateSummary.changesSummary,
            totalChanges: updateSummary.totalChanges,
          },
        );

      this.logger.log(
        successContext,
        `Template updated successfully: ${code} [${updateSummary.changesSummary}]`,
      );

      return result;
    } catch (error) {
      // Single error log with context
      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'UpdateTemplateUseCase',
          'execute',
          code,
          user,
          {
            operation: 'UPDATE',
            entityType: 'template',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            requestedFields: Object.keys(props || {}),
          },
        );

      this.logger.error(errorContext, `Template update failed: ${code}`);

      handleCommandError(
        error,
        TemplateExceptionMessage.notFound,
        TemplateExceptionMessage.updateError,
      );
      throw error;
    }
  }

  /**
   * Performs the update operation using aggregate methods for proper event emission.
   * Returns comprehensive summary for single log entry instead of verbose logging.
   * Each update method on the aggregate emits TemplateUpdatedEvent automatically.
   */
  private performUpdate(
    user: IUserToken,
    aggregate: Template,
    props: UpdateTemplateProps,
  ): UpdateSummary {
    const changes: FieldChange[] = [];

    // Batch all updates without individual logging
    // Only update the fields allowed by UpdateTemplateProps interface

    if (props.name !== undefined) {
      const oldValue = aggregate.name;
      aggregate.updateName(user, props.name);
      changes.push({ field: 'name', oldValue, newValue: props.name });
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

    if (props.active !== undefined) {
      const oldValue = aggregate.active;
      aggregate.updateActive(user, props.active);
      changes.push({ field: 'active', oldValue, newValue: props.active });
    }

    // Return summary instead of logging
    return {
      fieldsUpdated: changes.map((c) => c.field),
      eventsEmitted: aggregate.getUncommittedEvents().length,
      changesSummary: this.createChangesSummary(changes),
      totalChanges: changes.length,
    };
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
