/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ITemplateContent,
  ITemplateRetrievalService,
  TEMPLATE_RETRIEVAL_SERVICE,
} from 'src/shared/application/services/template-retrieval';
import { IUserToken } from 'src/shared/auth';

/**
 * Example service demonstrating how any template renderer can use
 * the generic template retrieval service without being coupled
 * to the core-template-manager implementation details.
 */
@Injectable()
export class ExampleTemplateRendererService {
  private readonly logger = new Logger(ExampleTemplateRendererService.name);

  constructor(
    @Inject(TEMPLATE_RETRIEVAL_SERVICE)
    private readonly templateRetrievalService: ITemplateRetrievalService,
  ) {}

  /**
   * Example: Render an email template
   */
  async renderEmailTemplate(
    user: IUserToken,
    templateCode: string,
    payload: Record<string, any>,
  ): Promise<string> {
    try {
      // Get template optimized for email transport
      const template = await this.templateRetrievalService.getTemplate(
        user,
        templateCode,
        {
          transport: 'email',
          includeInactive: false,
        },
      );

      if (!template) {
        this.logger.warn(
          `Email template not found: ${templateCode} for tenant: ${user.tenant}`,
        );
        return this.generateFallbackEmailContent(payload);
      }

      return this.renderTemplate(template, payload);
    } catch (error) {
      this.logger.error(
        `Failed to render email template ${templateCode}: ${error}`,
      );
      return this.generateFallbackEmailContent(payload);
    }
  }

  /**
   * Example: Render an SMS template
   */
  async renderSmsTemplate(
    user: IUserToken,
    templateCode: string,
    payload: Record<string, any>,
  ): Promise<string> {
    try {
      // Get template optimized for SMS transport (usually shorter)
      const template = await this.templateRetrievalService.getTemplate(
        user,
        templateCode,
        {
          transport: 'sms',
          includeInactive: false,
        },
      );

      if (!template) {
        this.logger.warn(
          `SMS template not found: ${templateCode} for tenant: ${user.tenant}`,
        );
        return this.generateFallbackSmsContent(payload);
      }

      const rendered = this.renderTemplate(template, payload);

      // SMS has length limitations
      if (rendered.length > 160) {
        this.logger.warn(
          `SMS template ${templateCode} exceeded 160 characters: ${rendered.length}`,
        );
        return rendered.substring(0, 157) + '...';
      }

      return rendered;
    } catch (error) {
      this.logger.error(
        `Failed to render SMS template ${templateCode}: ${error}`,
      );
      return this.generateFallbackSmsContent(payload);
    }
  }

  /**
   * Example: Check if templates exist before rendering
   */
  async validateTemplatesExist(
    user: IUserToken,
    templateCodes: string[],
    transport?: string,
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      templateCodes.map(async (templateCode) => {
        try {
          const exists = await this.templateRetrievalService.templateExists(
            user,
            templateCode,
            { transport, includeInactive: false },
          );
          results[templateCode] = exists;
        } catch (error) {
          this.logger.warn(
            `Error checking template existence ${templateCode}: ${error}`,
          );
          results[templateCode] = false;
        }
      }),
    );

    return results;
  }

  /**
   * Simple template rendering using handlebars-like syntax
   */
  private renderTemplate(
    template: ITemplateContent,
    payload: Record<string, any>,
  ): string {
    let content = template.content;

    // Simple placeholder replacement: {{key}} -> value
    for (const [key, value] of Object.entries(payload)) {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value ?? '');
      content = content.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return content;
  }

  private generateFallbackEmailContent(payload: Record<string, any>): string {
    return `Email notification: ${JSON.stringify(payload)}`;
  }

  private generateFallbackSmsContent(payload: Record<string, any>): string {
    const message = payload.message || 'Notification';
    return `SMS: ${message}`;
  }
}
