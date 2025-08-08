/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';
import { CreateMessageProps } from '../../domain/properties';
import { MessageTemplateDomainService } from '../../domain/services/message-template.domain-service';

/**
 * Use case for rendering message templates.
 * Orchestrates template loading and rendering using domain services.
 *
 * This implementation showcases:
 * - Proper separation between application orchestration and domain logic
 * - Use of domain services for business rule enforcement
 * - Template repository abstraction for infrastructure concerns
 * - Comprehensive error handling and logging
 */
@Injectable()
export class RenderMessageTemplateUseCase {
  private readonly logger = new Logger(RenderMessageTemplateUseCase.name);

  constructor(
    private readonly messageTemplateDomainService: MessageTemplateDomainService,
  ) {}

  /**
   * Renders a message using template and payload
   * @param props - The rendering properties
   * @returns Promise<string> - The rendered message
   */
  async execute(user: IUserToken, props: CreateMessageProps): Promise<string> {
    // Enhanced logging context for render operation start
    const operationContext =
      CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
        'RenderMessageTemplateUseCase',
        'execute',
        `${user.tenant}-${props.templateCode || 'no-template'}`,
        undefined, // No user context in this use case
        {
          operation: 'RENDER',
          entityType: 'message-template',
          phase: 'START',
          hasProps: !!props,
          templateCode: props?.templateCode,
          tenant: user?.tenant,
          channel: props?.channel,
          configCode: props?.configCode,
          hasPayload: !!props?.payload,
          payloadKeys: props?.payload ? Object.keys(props.payload).length : 0,
        },
      );

    this.logger.log(
      operationContext,
      `Starting message template rendering: templateCode '${props.templateCode || 'no-template'}', tenant '${user.tenant}'`,
    );

    try {
      // Check if template rendering is needed using domain service
      if (
        !this.messageTemplateDomainService.shouldRenderTemplate(
          props.templateCode,
          props.payload,
        )
      ) {
        const defaultMessage =
          this.messageTemplateDomainService.generateDefaultMessage(
            props.channel,
            props.configCode,
          );

        // Success logging with default message context
        const successContext =
          CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
            'RenderMessageTemplateUseCase',
            'execute',
            `${user.tenant}-${props.templateCode || 'no-template'}`,
            undefined,
            {
              operation: 'RENDER',
              entityType: 'message-template',
              phase: 'SUCCESS',
              renderingType: 'default_message',
              messageLength: defaultMessage.length,
              reason: 'no_template_rendering_needed',
            },
          );

        this.logger.log(
          successContext,
          `No template rendering needed - using default message: length ${defaultMessage.length}`,
        );

        return defaultMessage;
      }

      // TODO: Load template content from template repository
      // For now, use a mock template content
      const templateContent = await this.loadTemplateContent(
        props.templateCode!,
        user.tenant || 'rrrr',
      );

      // Use domain service to render the message
      const renderedMessage =
        this.messageTemplateDomainService.renderMessageContent(
          templateContent,
          props.payload!,
        );

      // Validate the rendered message using domain service
      if (
        !this.messageTemplateDomainService.validateRenderedMessage(
          renderedMessage,
        )
      ) {
        // Warning logging with validation failure context
        const warningContext =
          CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
            'RenderMessageTemplateUseCase',
            'execute',
            `${user.tenant}-${props.templateCode}`,
            undefined,
            {
              operation: 'RENDER',
              entityType: 'message-template',
              phase: 'WARNING',
              renderingType: 'validation_failed',
              templateCode: props.templateCode,
              renderedLength: renderedMessage.length,
              reason: 'rendered_message_validation_failed',
            },
          );

        this.logger.warn(
          warningContext,
          `Rendered message failed validation - using default message: templateCode '${props.templateCode}'`,
        );

        return this.messageTemplateDomainService.generateDefaultMessage(
          props.channel,
          props.configCode,
        );
      }

      // Success logging with rendered message context
      const successContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'RenderMessageTemplateUseCase',
          'execute',
          `${user.tenant}-${props.templateCode}`,
          undefined,
          {
            operation: 'RENDER',
            entityType: 'message-template',
            phase: 'SUCCESS',
            renderingType: 'template_rendered',
            templateCode: props.templateCode,
            renderedLength: renderedMessage.length,
            templateLength: templateContent.length,
            payloadKeys: props.payload ? Object.keys(props.payload).length : 0,
          },
        );

      this.logger.log(
        successContext,
        `Successfully rendered message template: templateCode '${props.templateCode}', length ${renderedMessage.length}`,
      );

      return renderedMessage;
    } catch (error) {
      // Error logging with enhanced context
      const errorContext =
        CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
          'RenderMessageTemplateUseCase',
          'execute',
          `${user.tenant}-${props.templateCode || 'no-template'}`,
          undefined,
          {
            operation: 'RENDER',
            entityType: 'message-template',
            phase: 'ERROR',
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            templateCode: props.templateCode,
            fallbackUsed: true,
          },
        );

      this.logger.error(
        errorContext,
        `Failed to render message template: templateCode '${props.templateCode || 'no-template'}' - using default message`,
      );

      // Fall back to default message on any error
      return this.messageTemplateDomainService.generateDefaultMessage(
        props.channel,
        props.configCode,
      );
    }
  }

  /**
   * Loads template content from the template repository
   * TODO: Replace with actual template repository implementation
   * @param templateCode - The template identifier
   * @param tenant - The tenant context
   * @returns Promise<string> - The template content
   */
  private loadTemplateContent(
    templateCode: string,
    tenant: string,
  ): Promise<string> {
    // TODO: Implement actual template loading from repository
    // This should load from database, file system, or external service

    // Mock template content for different template codes
    const mockTemplates: Record<string, string> = {
      'welcome-message':
        'Welcome {{userName}} to {{channelName}}! Your role is {{userRole}}.',
      notification: 'Alert: {{message}} at {{timestamp}}',
      reminder: 'Reminder: {{taskName}} is due on {{dueDate}}',
      'status-update':
        'Status Update: {{project}} is now {{status}} - {{details}}',
    };

    const templateContent = mockTemplates[templateCode];

    if (!templateContent) {
      throw new Error(
        `Template not found: ${templateCode} for tenant: ${tenant}`,
      );
    }

    return Promise.resolve(templateContent);
  }
}
