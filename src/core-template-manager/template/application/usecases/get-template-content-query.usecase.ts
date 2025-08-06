/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { AzureBlobStorageService } from 'src/shared/infrastructure/azure-storage';
import { ITemplate } from '../../domain/entities';
import {
  TemplateDomainException,
  TemplateExceptionMessage,
} from '../../domain/exceptions';
import { TemplateRepository } from '../../infrastructure/repositories';

/**
 * Query Use Case for retrieving template content by code from Azure Blob Storage
 * Follows Clean Architecture principles by encapsulating query business logic
 *
 * This use case:
 * 1. Retrieves the template metadata from the repository
 * 2. Extracts the blob path from the contentUrl
 * 3. Downloads the actual content from Azure Blob Storage
 * 4. Returns the template with the populated content field
 */
@Injectable()
export class GetTemplateContentQueryUseCase {
  private readonly logger = new Logger(GetTemplateContentQueryUseCase.name);

  constructor(
    private readonly repository: TemplateRepository,
    private readonly azureBlobStorageService: AzureBlobStorageService,
  ) {}

  async execute(user: IUserToken, code: string): Promise<ITemplate> {
    try {
      this.logger.debug(`Getting template content for code: ${code}`);

      // First, get the template metadata from the repository
      // Note: getTemplate throws TemplateDomainException if not found
      const template = await this.repository.getTemplate(user, code);

      // Extract blob path from contentUrl
      // Expected format: https://gstudios.blob.core.windows.net/private/{tenant}/templates/...
      const blobPath = this.extractBlobPath(template.contentUrl);
      const containerName = this.extractContainerName(template.contentUrl);

      this.logger.debug(`Downloading content from blob: ${blobPath}`);

      // Download the content from Azure Blob Storage
      const { content } = await this.azureBlobStorageService.getBlob({
        containerName,
        blobName: blobPath,
      });

      // Convert buffer to string (assuming UTF-8 encoding for template content)
      const contentString = content.toString('utf-8');

      this.logger.debug(
        `Successfully retrieved template content for code: ${code}`,
      );

      // Return the template with populated content
      return {
        ...template,
        content: contentString,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get template content for code: ${code}`,
        error instanceof Error ? error.stack : error,
      );

      if (error instanceof TemplateDomainException) {
        // Re-throw domain exceptions as NotFoundException to avoid exposing internal details
        throw new NotFoundException(TemplateExceptionMessage.notFound);
      }

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Re-throw with a generic message to avoid exposing internal details
      throw new NotFoundException(TemplateExceptionMessage.notFound);
    }
  }

  /**
   * Extracts the blob path from the full content URL
   * URL format: https://gstudios.blob.core.windows.net/private/{tenant}/templates/...
   * Returns: private/{tenant}/templates/...
   */
  private extractBlobPath(contentUrl: string): string {
    try {
      const url = new URL(contentUrl);
      // Remove the leading slash and the container name will be the first segment
      const pathSegments = url.pathname.substring(1).split('/');

      // Skip the container name (first segment) and return the rest as blob path
      // e.g., /private/tenant/templates/... -> private/tenant/templates/...
      return pathSegments.slice(1).join('/');
    } catch (error) {
      this.logger.error(`Invalid content URL format: ${contentUrl}`, error);
      throw new Error(`Invalid content URL format: ${contentUrl}`);
    }
  }

  /**
   * Extracts the container name from the content URL
   * URL format: https://gstudios.blob.core.windows.net/private/{tenant}/templates/...
   * Returns: private
   */
  private extractContainerName(contentUrl: string): string {
    try {
      const url = new URL(contentUrl);
      const pathSegments = url.pathname.substring(1).split('/');

      // First segment is the container name
      const containerName = pathSegments[0];

      if (!containerName) {
        throw new Error('Container name not found in URL');
      }

      return containerName;
    } catch (error) {
      this.logger.error(`Invalid content URL format: ${contentUrl}`, error);
      throw new Error(`Invalid content URL format: ${contentUrl}`);
    }
  }
}
