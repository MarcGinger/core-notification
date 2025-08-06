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
  UnauthorizedException,
} from '@nestjs/common';
import { handleCommandError } from 'src/shared/application/commands';
import { MessageRepository } from '../../infrastructure/repositories';
import { IUserToken } from 'src/shared/auth';
import { IMessage } from '../../domain/entities';
import { MessageExceptionMessage } from '../../domain/exceptions';
import { MessageDomainService } from '../../domain/services';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import { CreateMessageProps } from '../../domain/properties';

/**
 * Use case for creating send_slack_message entities with proper domain validation.
 * Demonstrates proper use of domain services for business rule validation.
 *
 * This implementation showcases:
 * - Proper separation of concerns between application and domain layers
 * - Use of domain services for complex business rules
 * - Comprehensive error handling and audit logging
 * - Input validation and sanitization
 * - Transaction management and rollback capabilities
 */
@Injectable()
export class CreateMessageUseCase {
  private readonly logger = new Logger(CreateMessageUseCase.name);

  constructor(
    private readonly repository: MessageRepository,
    private readonly domainService: MessageDomainService,
  ) {}

  /**
   * Creates a new send_slack_message with proper domain validation
   * Production-optimized with smart logging strategy
   * @param user - The user performing the operation
   * @param props - The creation properties
   * @returns Promise<IMessage> - The created send_slack_message DTO
   * @throws MessageExceptionMessage - When business rules prevent creation
   */
  async execute(
    user: IUserToken,
    props: CreateMessageProps,
  ): Promise<IMessage> {
    // Single operation start log with all context
    // Single operation start log
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'CreateMessageUseCase',
        'execute',
        props?.channel || 'unknown',
        user,
        {
          operation: 'CREATE',
          entityType: 'sendSlackMessage',
          phase: 'START',
          hasUser: !!user,
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
          userTenant: user?.tenant,
        },
      );

    this.logger.log(
      operationContext,
      `Starting sendSlackMessage creation: ${props?.channel || 'unknown'}`,
    );

    try {
      // Input validation (no logging unless error)
      this.validateInput(user, props);

      // Domain service interaction (single log for business operation)
      this.logger.log(
        operationContext,
        `Invoking domain service for sendSlackMessage creation: ${props.channel}`,
      );

      // Create aggregate and track events
      const aggregate = await this.domainService.createMessage(user, props);
      const eventsEmitted = aggregate.getUncommittedEvents();

      // Persist the aggregate
      const result = await this.repository.saveMessage(user, aggregate);

      // Single success log with comprehensive summary
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageUseCase',
          'execute',
          result.channel,
          user,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessage',
            phase: 'SUCCESS',
            createdCode: result.channel,
            eventsCommitted: eventsEmitted.length,
            eventTypes: eventsEmitted.map((e) => e.constructor.name),
          },
        );

      this.logger.log(
        successContext,
        `Successfully created sendSlackMessage: ${result.channel} [events: ${eventsEmitted.length}]`,
      );

      return result;
    } catch (error) {
      // Single error log with context
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageUseCase',
          'execute',
          props?.channel || 'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessage',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            inputProps: props ? Object.keys(props) : [],
          },
        );

      this.logger.error(
        errorContext,
        `Message creation failed: ${props?.channel || 'unknown'}`,
      );

      // Centralized error handling for domain and infra errors
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }

  /**
   * Enhanced input validation with detailed logging and business context
   * Validates technical concerns only - business rules enforced by domain aggregate
   */
  private validateInput(user: IUserToken, props: CreateMessageProps): void {
    // User validation
    if (!user) {
      this.logger.warn(
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageUseCase',
          'validateInput',
          'unknown',
          undefined,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessage',
            validationError: 'missing_user',
          },
        ),
        'Message creation attempted without user authentication',
      );
      throw new UnauthorizedException(
        MessageExceptionMessage.userRequiredToCreateMessage,
      );
    }

    // Props validation
    if (!props) {
      this.logger.warn(
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageUseCase',
          'validateInput',
          'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessage',
            validationError: 'missing_props',
          },
        ),
        'Message creation attempted without required properties',
      );
      throw new BadRequestException(
        MessageExceptionMessage.propsRequiredToCreateMessage,
      );
    }

    // Note: Business rules enforced by the Message aggregate's validateState() method
  }
}
