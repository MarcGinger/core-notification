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
import { IUserToken } from 'src/shared/auth';
import { IMessageQueue } from '../../domain/entities';
import { MessageQueueExceptionMessageQueue } from '../../domain/exceptions';
import { CreateMessageQueueProps } from '../../domain/properties';
import { MessageQueueDomainService } from '../../domain/services';
import { MessageQueueWorkerLoggingHelper } from '../../domain/value-objects';
import { MessageQueueRepository } from '../../infrastructure/repositories';

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
export class CreateMessageQueueUseCase {
  private readonly logger = new Logger(CreateMessageQueueUseCase.name);

  constructor(
    private readonly repository: MessageQueueRepository,
    private readonly domainService: MessageQueueDomainService,
  ) {}

  /**
   * Creates a new send_slack_message with proper domain validation
   * Production-optimized with smart logging strategy
   * @param user - The user performing the operation
   * @param props - The creation properties
   * @returns Promise<IMessageQueue> - The created send_slack_message DTO
   * @throws MessageQueueExceptionMessageQueue - When business rules prevent creation
   */
  async execute(
    user: IUserToken,
    props: CreateMessageQueueProps,
  ): Promise<IMessageQueue> {
    // Single operation start log with all context
    // Single operation start log
    const operationContext =
      MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
        'CreateMessageQueueUseCase',
        'execute',
        props?.channel || 'unknown',
        user,
        {
          operation: 'CREATE',
          entityType: 'sendSlackMessageQueue',
          phase: 'START',
          hasUser: !!user,
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
          userTenant: user?.tenant,
        },
      );

    this.logger.log(
      operationContext,
      `Starting sendSlackMessageQueue creation: ${props?.channel || 'unknown'}`,
    );

    try {
      // Input validation (no logging unless error)
      this.validateInput(user, props);

      // Domain service interaction (single log for business operation)
      this.logger.log(
        operationContext,
        `Invoking domain service for sendSlackMessageQueue creation: ${props.channel}`,
      );

      // Create aggregate and track events
      const aggregate = await this.domainService.createMessageQueue(
        user,
        props,
      );
      const eventsEmitted = aggregate.getUncommittedEvents();

      // Persist the aggregate
      const result = await this.repository.saveMessageQueue(user, aggregate);

      // Single success log with comprehensive summary
      const successContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageQueueUseCase',
          'execute',
          result.id,
          user,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessageQueue',
            phase: 'SUCCESS',
            createdCode: result.id,
            eventsCommitted: eventsEmitted.length,
            eventTypes: eventsEmitted.map((e) => e.constructor.name),
          },
        );

      this.logger.log(
        successContext,
        `Successfully created sendSlackMessageQueue: ${result.id} [events: ${eventsEmitted.length}]`,
      );

      return result;
    } catch (error) {
      // Single error log with context
      const errorContext =
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageQueueUseCase',
          'execute',
          props?.channel || 'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessageQueue',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessageQueue:
              error instanceof Error ? error.message : 'Unknown error',
            inputProps: props ? Object.keys(props) : [],
          },
        );

      this.logger.error(
        errorContext,
        `MessageQueue creation failed: ${props?.channel || 'unknown'}`,
      );

      // Centralized error handling for domain and infra errors
      handleCommandError(
        error,
        null,
        MessageQueueExceptionMessageQueue.createError,
      );
      throw error;
    }
  }

  /**
   * Enhanced input validation with detailed logging and business context
   * Validates technical concerns only - business rules enforced by domain aggregate
   */
  private validateInput(
    user: IUserToken,
    props: CreateMessageQueueProps,
  ): void {
    // User validation
    if (!user) {
      this.logger.warn(
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageQueueUseCase',
          'validateInput',
          'unknown',
          undefined,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessageQueue',
            validationError: 'missing_user',
          },
        ),
        'MessageQueue creation attempted without user authentication',
      );
      throw new UnauthorizedException(
        MessageQueueExceptionMessageQueue.userRequiredToCreateMessageQueue,
      );
    }

    // Props validation
    if (!props) {
      this.logger.warn(
        MessageQueueWorkerLoggingHelper.createEnhancedLogContext(
          'CreateMessageQueueUseCase',
          'validateInput',
          'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'sendSlackMessageQueue',
            validationError: 'missing_props',
          },
        ),
        'MessageQueue creation attempted without required properties',
      );
      throw new BadRequestException(
        MessageQueueExceptionMessageQueue.propsRequiredToCreateMessageQueue,
      );
    }

    // Note: Business rules enforced by the MessageQueue aggregate's validateState() method
  }
}
