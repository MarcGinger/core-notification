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
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../../../core-template-manager/template/domain';
import { IUserToken } from '../../auth';
import { ILogger } from '../../logger';
import { TemplateRepository } from './repositories';
import {
  ITemplateContent,
  ITemplateRetrievalOptions,
  ITemplateRetrievalService,
} from './template-retrieval/template-retrieval.interface';

/**
 * Core Template Manager implementation of the generic template retrieval service.
 * This service acts as a bridge between any template renderer and the core-template-manager
 * domain, providing a clean abstraction over the TemplateRepository.
 */
@Injectable()
export class CoreTemplateRetrievalService implements ITemplateRetrievalService {
  private readonly logger = new Logger(CoreTemplateRetrievalService.name);

  constructor(
    @Inject('ILogger') private readonly iLogger: ILogger,
    // Inject the TemplateRepository directly
    private readonly templateRepository: TemplateRepository,
  ) {}

  /**
   * Retrieves a single template by code
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

    this.logger.debug(
      `Retrieving template: ${templateCode} for tenant: ${user.tenant}`,
    );

    try {
      // Use the existing TemplateRepository public method
      // Note: getTemplate throws if not found, so we handle that case
      const template = await this.templateRepository.getTemplate(
        user,
        templateCode,
      );

      // Apply filtering based on options
      if (options) {
        if (options.includeInactive === false && template.active === false) {
          this.logger.debug(
            `Template ${templateCode} is inactive and includeInactive=false`,
          );
          return undefined;
        }

        if (options.version && template.version !== options.version) {
          this.logger.debug(
            `Template ${templateCode} version mismatch: expected ${options.version}, found ${template.version}`,
          );
          return undefined;
        }

        if (
          options.useCase &&
          template.useCase !== (options.useCase as TemplateUseCaseEnum)
        ) {
          this.logger.debug(
            `Template ${templateCode} useCase mismatch: expected ${options.useCase}, found ${template.useCase}`,
          );
          return undefined;
        }

        if (
          options.transport &&
          template.transport !== (options.transport as TemplateTransportEnum)
        ) {
          this.logger.debug(
            `Template ${templateCode} transport mismatch: expected ${options.transport}, found ${template.transport}`,
          );
          return undefined;
        }
      }

      // Convert to generic template content interface
      const templateContent: ITemplateContent = {
        code: template.code,
        name: template.name,
        content: template.content,
        contentUrl: template.contentUrl,
        version: template.version,
        active: template.active,
        payloadSchema: template.payloadSchema,
        transport: template.transport,
        useCase: template.useCase,
        description: template.description,
      };

      this.logger.debug(
        `Successfully retrieved template: ${templateCode} for tenant: ${user.tenant}`,
      );

      return templateContent;
    } catch (error) {
      this.iLogger.error(
        logContext,
        `Failed to retrieve template: ${templateCode} for tenant: ${user.tenant}`,
      );

      // Check if it's a "not found" error - return undefined
      if (error instanceof Error && error.message.includes('not found')) {
        this.logger.debug(
          `Template not found: ${templateCode} for tenant: ${user.tenant}`,
        );
        return undefined;
      }

      // Re-throw other errors
      throw error;
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
    const template = await this.getTemplate(user, templateCode, options);
    return template?.content;
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
}
