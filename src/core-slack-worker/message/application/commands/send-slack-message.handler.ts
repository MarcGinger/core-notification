/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { SendSlackMessageCommand } from './send-slack-message.command';
import {
  SendSlackMessageUseCase,
  SlackMessageResult,
} from '../usecases/send-slack-message.usecase';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';

/**
 * Command handler for SendSlackMessageCommand
 * Orchestrates the send Slack message use case through CQRS pattern
 */
@CommandHandler(SendSlackMessageCommand)
export class SendSlackMessageHandler
  implements ICommandHandler<SendSlackMessageCommand, SlackMessageResult>
{
  private readonly logger = new Logger(SendSlackMessageHandler.name);

  constructor(
    @Inject('ILogger') private readonly structuredLogger: ILogger,
    private readonly sendSlackMessageUseCase: SendSlackMessageUseCase,
  ) {}

  /**
   * Execute the send Slack message command
   */
  async execute(command: SendSlackMessageCommand): Promise<SlackMessageResult> {
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'SendSlackMessageHandler',
        'execute',
        command.correlationId,
        undefined, // User context will be created internally
        {
          operation: 'COMMAND_HANDLER',
          command: 'SendSlackMessageCommand',
          phase: 'START',
          messageId: command.messageId,
          tenant: command.tenant,
          channel: command.channel,
          configCode: command.configCode,
          isRetry: command.isRetry || false,
          retryAttempt: command.retryAttempt || 0,
          priority: command.priority || 'normal',
        },
      );

    this.structuredLogger.log(
      operationContext,
      `Executing SendSlackMessageCommand: messageId '${command.messageId}'`,
    );

    try {
      // Create system user context for the use case
      const systemUser: IUserToken = {
        sub: 'system-slack-command-handler',
        preferred_username: 'system',
        name: 'System Slack Command Handler',
        email: 'system@internal',
        tenant: command.tenant,
        roles: ['system'],
      } as IUserToken;

      // Convert command to use case data and execute
      const useCaseData = command.toUseCaseData();
      const result = await this.sendSlackMessageUseCase.execute(
        systemUser,
        useCaseData,
      );

      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SendSlackMessageHandler',
          'execute',
          command.correlationId,
          systemUser,
          {
            operation: 'COMMAND_HANDLER',
            command: 'SendSlackMessageCommand',
            phase: 'SUCCESS',
            messageId: command.messageId,
            success: result.success,
            isRetryable: result.isRetryable,
            slackTimestamp: result.slackTimestamp,
          },
        );

      this.structuredLogger.log(
        successContext,
        `Successfully executed SendSlackMessageCommand: messageId '${command.messageId}', success: ${result.success}`,
      );

      return result;
    } catch (error) {
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'SendSlackMessageHandler',
          'execute',
          command.correlationId,
          undefined,
          {
            operation: 'COMMAND_HANDLER',
            command: 'SendSlackMessageCommand',
            phase: 'ERROR',
            messageId: command.messageId,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          },
        );

      this.structuredLogger.error(
        errorContext,
        `Failed to execute SendSlackMessageCommand: messageId '${command.messageId}'`,
      );

      throw error;
    }
  }
}
