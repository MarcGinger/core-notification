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
import { IUserToken } from '../../../auth';
import { AzureBlobStorageService } from '../../../infrastructure/azure-storage';
import { RedisUtilityService } from '../../../infrastructure/redis';
import { ILogger } from '../../../logger';
import {
  ITemplateContent,
  ITemplateRetrievalOptions,
  ITemplateRetrievalService,
  TEMPLATE_RETRIEVAL_SERVICE,
} from './template-retrieval.interface';

/**
 * Simple implementation of the generic template retrieval service.
 * This uses mock templates for now to avoid complex dependency issues with TemplateRepository.
 *
 * TODO: Replace with actual TemplateRepository integration once dependency issues are resolved.
 */
@Injectable()
export class CoreTemplateRetrievalService implements ITemplateRetrievalService {
  private readonly logger = new Logger(CoreTemplateRetrievalService.name);

  constructor(
    @Inject('ILogger') private readonly iLogger: ILogger,
    private readonly redisUtilityService: RedisUtilityService,
    private readonly azureBlobStorageService: AzureBlobStorageService,
  ) {}

  /**
   * Retrieves a single template by code using mock data
   */
  async getTemplate(
    user: IUserToken,
    templateCode: string,
    options?: ITemplateRetrievalOptions,
  ): Promise<ITemplateContent | undefined> {
    const logContext = this.createLogContext(
      'getTemplate',
      templateCode,
      user,
      options,
    );

    this.logger.log(
      `Retrieving template: ${templateCode} for tenant: ${user.tenant}`,
    );

    // Add console.log for immediate visibility during development
    console.log(
      `🔍 [TEMPLATE SERVICE] Retrieving template: ${templateCode} for tenant: ${user.tenant}`,
    );

    try {
      // Mock template data - replace with actual repository call later
      const mockTemplate = this.getMockTemplate(templateCode);

      if (!mockTemplate) {
        console.log(
          `❌ [TEMPLATE SERVICE] Template not found: ${templateCode}`,
        );
        this.logger.debug(
          `Template not found: ${templateCode} for tenant: ${user.tenant}`,
        );
        return undefined;
      }

      console.log(`✅ [TEMPLATE SERVICE] Found template: ${templateCode}`);

      // Apply filtering based on options
      if (options) {
        if (
          options.includeInactive === false &&
          mockTemplate.active === false
        ) {
          console.log(
            `⚠️ [TEMPLATE SERVICE] Template ${templateCode} is inactive`,
          );
          this.logger.debug(
            `Template ${templateCode} is inactive and includeInactive=false`,
          );
          return undefined;
        }

        if (options.version && mockTemplate.version !== options.version) {
          console.log(
            `⚠️ [TEMPLATE SERVICE] Template ${templateCode} version mismatch`,
          );
          this.logger.debug(
            `Template ${templateCode} version mismatch: expected ${options.version}, found ${mockTemplate.version}`,
          );
          return undefined;
        }

        if (options.useCase && mockTemplate.useCase !== options.useCase) {
          console.log(
            `⚠️ [TEMPLATE SERVICE] Template ${templateCode} useCase mismatch`,
          );
          this.logger.debug(
            `Template ${templateCode} useCase mismatch: expected ${options.useCase}, found ${mockTemplate.useCase}`,
          );
          return undefined;
        }

        if (options.transport && mockTemplate.transport !== options.transport) {
          console.log(
            `⚠️ [TEMPLATE SERVICE] Template ${templateCode} transport mismatch`,
          );
          this.logger.debug(
            `Template ${templateCode} transport mismatch: expected ${options.transport}, found ${mockTemplate.transport}`,
          );
          return undefined;
        }
      }

      console.log(
        `🎉 [TEMPLATE SERVICE] Successfully retrieved template: ${templateCode}`,
      );
      this.logger.debug(
        `Successfully retrieved template: ${templateCode} for tenant: ${user.tenant}`,
      );

      return mockTemplate;
    } catch (error) {
      this.iLogger.error(
        logContext,
        `Failed to retrieve template: ${templateCode} for tenant: ${user.tenant}`,
      );

      // For mock implementation, just return undefined on any error
      return undefined;
    }
  }

  /**
   * Retrieves multiple templates by codes
   */
  async getTemplates(
    user: IUserToken,
    templateCodes: string[],
    options?: ITemplateRetrievalOptions,
  ): Promise<ITemplateContent[]> {
    if (!templateCodes || templateCodes.length === 0) {
      return [];
    }

    this.logger.debug(
      `Retrieving ${templateCodes.length} templates for tenant: ${user.tenant}`,
    );

    try {
      const results: ITemplateContent[] = [];

      for (const code of templateCodes) {
        const template = await this.getTemplate(user, code, options);
        if (template) {
          results.push(template);
        }
      }

      this.logger.debug(
        `Successfully retrieved ${results.length}/${templateCodes.length} templates for tenant: ${user.tenant}`,
      );

      return results;
    } catch {
      // For batch operations, return empty array on error
      return [];
    }
  }

  /**
   * Checks if a template exists without loading its content
   */
  async templateExists(
    user: IUserToken,
    templateCode: string,
    options?: ITemplateRetrievalOptions,
  ): Promise<boolean> {
    try {
      const template = await this.getTemplate(user, templateCode, options);
      return template !== undefined;
    } catch {
      this.logger.warn(
        `Error checking template existence: ${templateCode} for tenant: ${user.tenant}`,
      );
      return false;
    }
  }

  /**
   * Gets template content only (optimized for rendering)
   */
  async getTemplateContent(
    user: IUserToken,
    templateCode: string,
    options?: ITemplateRetrievalOptions,
  ): Promise<string | undefined> {
    console.log(
      `📝 [TEMPLATE SERVICE] Getting template content: ${templateCode} for tenant: ${user.tenant}`,
    );

    const template = await this.getTemplate(user, templateCode, options);
    const content = template?.content;

    if (content) {
      console.log(
        `📄 [TEMPLATE SERVICE] Retrieved template content: ${templateCode}, length: ${content.length}`,
      );
    } else {
      console.log(
        `❌ [TEMPLATE SERVICE] No content found for template: ${templateCode}`,
      );
    }

    return content;
  }

  /**
   * Creates enhanced log context for operations
   */
  private createLogContext(
    operation: string,
    templateIdentifier: string,
    user: IUserToken,
    options?: ITemplateRetrievalOptions,
  ): Record<string, unknown> {
    return {
      component: 'CoreTemplateRetrievalService',
      operation,
      templateIdentifier,
      tenant: user.tenant,
      username: user.preferred_username,
      userId: user.sub,
      options: options ? JSON.stringify(options) : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mock template data for testing and development
   */
  private getMockTemplate(templateCode: string): ITemplateContent | undefined {
    const mockTemplates: Record<string, ITemplateContent> = {
      'welcome-message': {
        code: 'welcome-message',
        name: 'Welcome Message Template',
        content:
          'Welcome {{userName}} to {{channelName}}! Your role is {{userRole}}.',
        contentUrl: '/templates/welcome-message.hbs',
        version: 1,
        active: true,
        transport: 'slack',
        useCase: 'generic',
        description: 'Welcome message for new channel members',
        payloadSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string' },
            channelName: { type: 'string' },
            userRole: { type: 'string' },
          },
          required: ['userName', 'channelName'],
        },
      },
      notification: {
        code: 'notification',
        name: 'Notification Template',
        content: 'Alert: {{message}} at {{timestamp}}',
        contentUrl: '/templates/notification.hbs',
        version: 1,
        active: true,
        transport: 'slack',
        useCase: 'generic',
        description: 'General notification template',
        payloadSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
          required: ['message'],
        },
      },
      reminder: {
        code: 'reminder',
        name: 'Reminder Template',
        content: 'Reminder: {{taskName}} is due on {{dueDate}}',
        contentUrl: '/templates/reminder.hbs',
        version: 1,
        active: true,
        transport: 'slack',
        useCase: 'generic',
        description: 'Task reminder template',
        payloadSchema: {
          type: 'object',
          properties: {
            taskName: { type: 'string' },
            dueDate: { type: 'string' },
          },
          required: ['taskName', 'dueDate'],
        },
      },
      'status-update': {
        code: 'status-update',
        name: 'Status Update Template',
        content: 'Status Update: {{project}} is now {{status}} - {{details}}',
        contentUrl: '/templates/status-update.hbs',
        version: 1,
        active: true,
        transport: 'slack',
        useCase: 'generic',
        description: 'Project status update template',
        payloadSchema: {
          type: 'object',
          properties: {
            project: { type: 'string' },
            status: { type: 'string' },
            details: { type: 'string' },
          },
          required: ['project', 'status'],
        },
      },
    };

    return mockTemplates[templateCode];
  }
}

// Export the token for dependency injection
export { TEMPLATE_RETRIEVAL_SERVICE };
