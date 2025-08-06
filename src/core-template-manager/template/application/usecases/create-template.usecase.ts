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
import { AzureBlobStorageService } from 'src/shared/infrastructure/azure-storage';
import { AjvSchemaValidationService } from 'src/shared/infrastructure/validation';
import { CoreTemplateManagerLoggingHelper } from '../../../shared/domain/value-objects';
import { ITemplate } from '../../domain/entities';
import { TemplateExceptionMessage } from '../../domain/exceptions';
import {
  CreateTemplateProps,
  EnhancedCreateTemplateProps,
} from '../../domain/properties';
import { TemplateDomainService } from '../../domain/services';
import { TemplateRepository } from '../../infrastructure/repositories';

/**
 * Use case for creating template entities with proper domain validation.
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
export class CreateTemplateUseCase {
  private readonly logger = new Logger(CreateTemplateUseCase.name);

  constructor(
    private readonly repository: TemplateRepository,
    private readonly domainService: TemplateDomainService,
    private readonly azureBlobStorageService: AzureBlobStorageService,
    private readonly ajvValidationService: AjvSchemaValidationService,
  ) {}

  /**
   * Creates a new template with proper domain validation
   * Production-optimized with smart logging strategy
   * @param user - The user performing the operation
   * @param props - The creation properties
   * @returns Promise<ITemplate> - The created template DTO
   * @throws TemplateExceptionMessage - When business rules prevent creation
   */
  async execute(
    user: IUserToken,
    props: CreateTemplateProps,
  ): Promise<ITemplate> {
    // Single operation start log with all context
    // Single operation start log
    const operationContext =
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'CreateTemplateUseCase',
        'execute',
        props?.code || 'unknown',
        user,
        {
          operation: 'CREATE',
          entityType: 'template',
          phase: 'START',
          hasUser: !!user,
          hasProps: !!props,
          propsFields: props ? Object.keys(props).length : 0,
          userTenant: user?.tenant,
        },
      );

    this.logger.log(
      operationContext,
      `Starting template creation: ${props?.code || 'unknown'}`,
    );

    try {
      // Input validation (no logging unless error)
      this.validateInput(user, props);

      // Generate version and blob path
      const version = await this.generateVersion(user, props.code);
      const blobPath = this.generateBlobPath(
        user.tenant || 'default',
        props,
        version,
      );

      // Upload content to Azure Blob Storage
      this.logger.log(
        operationContext,
        `Uploading template content to blob storage: ${blobPath}`,
      );

      await this.azureBlobStorageService.uploadBlob({
        containerName: 'private',
        blobName: blobPath,
        data: props.content,
        contentType: this.getContentType(props.transport),
        metadata: {
          tenant: user.tenant || 'default',
          templateCode: props.code,
          version: version.toString(),
          transport: props.transport,
          useCase: props.useCase,
          uploadedBy: user.preferred_username || 'unknown',
          uploadedAt: new Date().toISOString(),
        },
      });

      const contentUrl = this.buildContentUrl(blobPath);

      // Domain service interaction (single log for business operation)
      this.logger.log(
        operationContext,
        `Invoking domain service for template creation: ${props.code}`,
      );

      // Create aggregate with enhanced props including generated fields
      const enhancedProps: EnhancedCreateTemplateProps = {
        ...props,
        version,
        contentUrl,
      };

      // Create aggregate and track events
      const aggregate = await this.domainService.createTemplate(
        user,
        enhancedProps,
      );
      const eventsEmitted = aggregate.getUncommittedEvents();

      // Persist the aggregate
      const result = await this.repository.saveTemplate(user, aggregate);

      // Single success log with comprehensive summary
      const successContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'execute',
          result.code,
          user,
          {
            operation: 'CREATE',
            entityType: 'template',
            phase: 'SUCCESS',
            createdCode: result.code,
            eventsCommitted: eventsEmitted.length,
            eventTypes: eventsEmitted.map((e) => e.constructor.name),
          },
        );

      this.logger.log(
        successContext,
        `Successfully created template: ${result.code} [events: ${eventsEmitted.length}]`,
      );

      return result;
    } catch (error) {
      // Single error log with context
      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'execute',
          props?.code || 'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'template',
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
        `Template creation failed: ${props?.code || 'unknown'}`,
      );

      // Centralized error handling for domain and infra errors
      handleCommandError(error, null, TemplateExceptionMessage.createError);
      throw error;
    }
  }

  /**
   * Enhanced input validation with detailed logging and business context
   * Validates technical concerns only - business rules enforced by domain aggregate
   */
  private validateInput(user: IUserToken, props: CreateTemplateProps): void {
    // User validation
    if (!user) {
      this.logger.warn(
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'validateInput',
          'unknown',
          undefined,
          {
            operation: 'CREATE',
            entityType: 'template',
            validationError: 'missing_user',
          },
        ),
        'Template creation attempted without user authentication',
      );
      throw new UnauthorizedException(
        TemplateExceptionMessage.userRequiredToCreateTemplate,
      );
    }

    // Props validation
    if (!props) {
      this.logger.warn(
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'validateInput',
          'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'template',
            validationError: 'missing_props',
          },
        ),
        'Template creation attempted without required properties',
      );
      throw new BadRequestException(
        TemplateExceptionMessage.propsRequiredToCreateTemplate,
      );
    }

    // Validate payload schema with AJV
    if (props.payloadSchema) {
      this.validatePayloadSchema(user, props);
    }

    // Note: Business rules enforced by the Template aggregate's validateState() method
  }

  /**
   * Validates the payload schema using AJV JSON schema validation
   * @param user - The user context for logging
   * @param props - The template creation properties
   * @throws BadRequestException - When payload schema is invalid
   */
  private validatePayloadSchema(
    user: IUserToken,
    props: CreateTemplateProps,
  ): void {
    const validationResult =
      this.ajvValidationService.validateTemplatePayloadSchema(
        props.payloadSchema,
      );

    if (!validationResult.isValid) {
      const errorContext =
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'validatePayloadSchema',
          props.code || 'unknown',
          user,
          {
            operation: 'CREATE',
            entityType: 'template',
            validationError: 'invalid_payload_schema',
            schemaErrors: validationResult.errors,
            errorCount: validationResult.errors.length,
          },
        );

      this.logger.warn(
        errorContext,
        `Invalid payload schema for template ${props.code}: ${validationResult.errors.join(', ')}`,
      );

      throw new BadRequestException(
        `Invalid payload schema: ${validationResult.errors.join('; ')}`,
      );
    }

    // Log successful validation for debugging
    this.logger.debug(
      CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
        'CreateTemplateUseCase',
        'validatePayloadSchema',
        props.code || 'unknown',
        user,
        {
          operation: 'CREATE',
          entityType: 'template',
          phase: 'VALIDATION_SUCCESS',
          schemaType: props.payloadSchema.type || 'unknown',
          propertyCount: props.payloadSchema.properties
            ? Object.keys(props.payloadSchema.properties).length
            : 0,
        },
      ),
      `Payload schema validation passed for template ${props.code}`,
    );
  }

  /**
   * Generates a version number for the template by checking existing versions
   * and incrementing to the next available version number
   * @param user - The user context for tenant information
   * @param templateCode - The template code to check versions for
   * @returns Promise<number> - The next available version number
   */
  private async generateVersion(
    user: IUserToken,
    templateCode: string,
  ): Promise<number> {
    try {
      // Get all existing templates for this tenant with the same code
      const existingTemplates = await this.repository.getByCodes(user, [
        templateCode,
      ]);

      if (!existingTemplates || existingTemplates.length === 0) {
        // No existing templates, start with version 1
        return 1;
      }

      // Find the highest version number
      const maxVersion = existingTemplates.reduce((max, template) => {
        const version = template.version || 1;
        return version > max ? version : max;
      }, 0);

      // Return the next version
      const nextVersion = maxVersion + 1;

      this.logger.debug(
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'generateVersion',
          templateCode,
          user,
          {
            existingVersions: existingTemplates.length,
            maxVersion,
            nextVersion,
          },
        ),
        `Generated version ${nextVersion} for template ${templateCode} (${existingTemplates.length} existing versions)`,
      );

      return nextVersion;
    } catch (error) {
      // If there's an error querying existing templates, default to version 1
      this.logger.warn(
        CoreTemplateManagerLoggingHelper.createEnhancedLogContext(
          'CreateTemplateUseCase',
          'generateVersion',
          templateCode,
          user,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            fallbackVersion: 1,
          },
        ),
        `Failed to query existing versions for ${templateCode}, defaulting to version 1`,
      );

      return 1;
    }
  }

  /**
   * Generates the blob storage path following the pattern:
   * private/{tenant}/templates/{transport}/{useCase}/{code}/v{version}.extension
   */
  private generateBlobPath(
    tenant: string,
    props: CreateTemplateProps,
    version: number,
  ): string {
    const extension = this.getFileExtension(props.transport);
    return `${tenant}/templates/${props.transport}/${props.useCase}/${props.code}/v${version}.${extension}`;
  }

  /**
   * Builds the full content URL from the blob path
   */
  private buildContentUrl(blobPath: string): string {
    // Use the container path from environment or build from connection string
    const containerPath =
      process.env.AZURE_STORAGE_CONTAINER_PATH ||
      'https://gstudios.blob.core.windows.net';
    return `${containerPath}/private/${blobPath}`;
  }

  /**
   * Determines the content type based on transport method
   */
  private getContentType(transport: string): string {
    switch (transport.toLowerCase()) {
      case 'email':
        return 'text/html';
      case 'sms':
        return 'text/plain';
      case 'push':
        return 'application/json';
      case 'slack':
        return 'text/plain';
      default:
        return 'text/html';
    }
  }

  /**
   * Determines the file extension based on transport method
   */
  private getFileExtension(transport: string): string {
    switch (transport.toLowerCase()) {
      case 'email':
        return 'html';
      case 'sms':
        return 'txt';
      case 'push':
      case 'slack':
        return 'json';
      default:
        return 'html';
    }
  }
}
