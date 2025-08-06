/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { ILogger } from 'src/shared/logger';
import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { RedisUtilityService } from 'src/shared/infrastructure/redis';
import { SnapshotTemplateProps } from '../../domain/properties';
import { TemplateProjectionKeys } from '../../domain/value-objects/template-projection-keys';

/**
 * Template Redis projection service responsible for maintaining
 * Redis projection of template entities from EventStore streams.
 *
 * This projection enables the existing TemplateRepository to continue
 * working with Redis while the data source transitions to EventStore.
 */
@Injectable()
export class TemplateRedisProjection {
  private readonly redisProjectionKey =
    TemplateProjectionKeys.getRedisProjectionKey();
  private readonly esdbStreamPrefix =
    TemplateProjectionKeys.getEventStoreStreamPrefix();

  private isInitialized = false;
  private readonly systemUser: IUserToken;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly redisUtilityService: RedisUtilityService,
  ) {
    // Create a system user for Redis operations
    this.systemUser = {
      sub: 'system-template-projection',
      preferred_username: 'system',
      name: 'System Template Projection',
      email: 'system@internal',
      tenant: 'system',
      roles: ['system'],
    } as IUserToken;
  }

  /**
   * Get all templates for a tenant with optional filtering
   * This method reads directly from Redis projection for optimal performance
   */
  async getTemplatesForTenant(
    tenant: string,
    filter?: {
      code?: string;
      name?: string;
    },
  ): Promise<SnapshotTemplateProps[]> {
    try {
      // Create tenant-specific user context for Redis operations
      const tenantUser: IUserToken = {
        ...this.systemUser,
        tenant,
      };

      // Get all templates for the tenant from Redis
      const allTemplates =
        await this.redisUtilityService.getAllValues<SnapshotTemplateProps>(
          tenantUser,
          this.redisProjectionKey,
        );

      if (!allTemplates || allTemplates.length === 0) {
        this.logger.debug(
          { tenant },
          'No templates found for tenant in Redis projection',
        );
        return [];
      }

      // Apply filters if provided
      let filteredTemplates = allTemplates;

      if (filter) {
        filteredTemplates = allTemplates.filter((template) => {
          if (filter.code) {
            // Filter by code (case-insensitive partial match)
            if (
              !template.code.toLowerCase().includes(filter.code.toLowerCase())
            ) {
              return false;
            }
          }

          if (filter.name) {
            // Filter by name (case-insensitive partial match)
            if (
              !template.name.toLowerCase().includes(filter.name.toLowerCase())
            ) {
              return false;
            }
          }

          return true;
        });
      }

      this.logger.debug(
        {
          tenant,
          totalCount: allTemplates.length,
          filteredCount: filteredTemplates.length,
          filter,
        },
        'Successfully retrieved templates for tenant from Redis projection',
      );

      return filteredTemplates;
    } catch (error) {
      this.logger.error(
        {
          tenant,
          filter,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get templates for tenant from Redis projection',
      );
      return [];
    }
  }

  /**
   * Get templates by multiple codes efficiently from Redis
   * Optimized for bulk operations with a single Redis round-trip
   */
  async getTemplatesByCodes(
    tenant: string,
    codes: string[],
  ): Promise<SnapshotTemplateProps[]> {
    if (!codes || codes.length === 0) {
      return [];
    }

    try {
      // Create tenant-specific user context for Redis operations
      const tenantUser: IUserToken = {
        ...this.systemUser,
        tenant,
      };

      // Use getMany for efficient bulk retrieval with single Redis call
      const templates =
        await this.redisUtilityService.getMany<SnapshotTemplateProps>(
          tenantUser,
          this.redisProjectionKey,
          codes,
        );

      this.logger.debug(
        {
          tenant,
          requestedCodes: codes,
          foundCount: templates.length,
          totalRequested: codes.length,
        },
        'Successfully retrieved templates by codes from Redis projection',
      );

      return templates;
    } catch (error) {
      this.logger.error(
        {
          tenant,
          codes,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get templates by codes from Redis projection',
      );
      return [];
    }
  }

  /**
   * Get a single template by tenant and code from Redis
   * Used for individual template lookups with optimal performance
   */
  async getTemplateByCode(
    tenant: string,
    code: string,
  ): Promise<SnapshotTemplateProps | null> {
    try {
      // Create tenant-specific user context for Redis operations
      const tenantUser: IUserToken = {
        ...this.systemUser,
        tenant,
      };

      // Read the template data directly - getOne returns undefined if not found
      const template =
        await this.redisUtilityService.getOne<SnapshotTemplateProps>(
          tenantUser,
          this.redisProjectionKey,
          code,
        );

      if (!template) {
        this.logger.debug(
          { tenant, code },
          'Template not found in Redis projection',
        );
        return null;
      }

      this.logger.debug(
        { tenant, code },
        'Successfully retrieved template from Redis projection',
      );

      return template;
    } catch (error) {
      this.logger.error(
        {
          tenant,
          code,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get template by code from Redis projection',
      );
      return null;
    }
  }

  /**
   * Handle template events and update Redis projection
   */
  async handleTemplateEvent(
    evt: SnapshotTemplateProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Extract tenant from stream metadata or use default
      const tenant = meta.tenant || this.extractTenantFromStream(meta.stream);

      if (!tenant) {
        this.logger.warn(
          { evt, meta },
          'No tenant found in event metadata, skipping Redis update',
        );
        return;
      }

      // Create tenant-specific user context for Redis operations
      const tenantUser: IUserToken = {
        ...this.systemUser,
        tenant,
      };

      // Handle different event types
      if (this.isDeleteEvent(meta.eventType)) {
        await this.handleTemplateDelete(evt, tenantUser, meta);
      } else {
        await this.handleTemplateUpsert(evt, tenantUser, meta);
      }

      this.logger.debug(
        {
          tenant,
          templateCode: evt.code,
          eventType: meta.eventType,
          streamName: meta.stream,
          version: meta.version,
        },
        'Updated Redis projection from EventStore event',
      );
    } catch (error) {
      this.logger.error(
        {
          evt,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to handle template event in Redis projection',
      );
    }
  }

  /**
   * Handle template creation/update events
   */
  private async handleTemplateUpsert(
    evt: SnapshotTemplateProps,
    user: IUserToken,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Convert event data to Redis format (same as SnapshotTemplateProps)
      const redisData: SnapshotTemplateProps = {
        code: evt.code,
        name: evt.name,
        description: evt.description,
        transport: evt.transport,
        useCase: evt.useCase,
        version: evt.version,
        content: evt.content,
        contentUrl: evt.contentUrl,
        payloadSchema: evt.payloadSchema,
        active: evt.active,
      };

      // Write to Redis using the same key pattern as TemplateRepository
      await this.redisUtilityService.write(
        user,
        this.redisProjectionKey,
        evt.code,
        redisData,
      );

      this.logger.debug(
        {
          tenant: user.tenant,
          templateCode: evt.code,
          eventType: meta.eventType,
        },
        'Template upserted in Redis projection',
      );
    } catch (error) {
      this.logger.error(
        {
          evt,
          user: user.tenant,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to upsert template in Redis projection',
      );
      throw error;
    }
  }

  /**
   * Handle template deletion events
   */
  private async handleTemplateDelete(
    evt: SnapshotTemplateProps,
    user: IUserToken,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Check if template exists before deletion
      const exists = await this.redisUtilityService.exists(
        user,
        this.redisProjectionKey,
        evt.code,
      );

      if (exists) {
        await this.redisUtilityService.delete(
          user,
          this.redisProjectionKey,
          evt.code,
        );

        this.logger.debug(
          {
            tenant: user.tenant,
            templateCode: evt.code,
            eventType: meta.eventType,
          },
          'Template deleted from Redis projection',
        );
      } else {
        this.logger.debug(
          {
            tenant: user.tenant,
            templateCode: evt.code,
            eventType: meta.eventType,
          },
          'Template not found in Redis for deletion',
        );
      }
    } catch (error) {
      this.logger.error(
        {
          evt,
          user: user.tenant,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to delete template from Redis projection',
      );
      throw error;
    }
  }

  /**
   * Extract tenant from stream name using domain value object
   * Expected format: banking.template.v1-tenant123-TEMPLATECODE
   */
  private extractTenantFromStream(streamName: string): string | null {
    try {
      // Use domain value object for extraction
      const extracted =
        TemplateProjectionKeys.extractFromStreamName(streamName);

      if (!extracted) {
        this.logger.warn(
          {
            streamName,
            expectedPattern: `${this.esdbStreamPrefix}-{tenant}-{code}`,
            esdbKey: this.esdbStreamPrefix,
            redisKey: this.redisProjectionKey,
          },
          'Stream name does not match expected EventStore pattern',
        );
        return null;
      }

      this.logger.debug(
        {
          streamName,
          tenant: extracted.tenant,
          templateCode: extracted.code,
          esdbPattern: this.esdbStreamPrefix,
          redisPattern: this.redisProjectionKey,
        },
        'Successfully extracted tenant from EventStore stream name',
      );

      return extracted.tenant;
    } catch (error) {
      this.logger.error(
        {
          streamName,
          esdbKey: this.esdbStreamPrefix,
          error,
        },
        'Failed to extract tenant from stream name',
      );
      return null;
    }
  }

  /**
   * Check if event type indicates a deletion
   */
  private isDeleteEvent(eventType: string): boolean {
    const deleteEventTypes = [
      'TemplateDeleted',
      'TemplateDeletedEvent',
      'template-deleted',
      'template.deleted',
    ];

    return deleteEventTypes.some((type) =>
      eventType.toLowerCase().includes(type.toLowerCase()),
    );
  }

  /**
   * Rebuild Redis projection from scratch (useful for recovery)
   */
  async rebuildProjection(tenants: string[] = []): Promise<void> {
    this.logger.log(
      { tenants },
      'Starting Redis projection rebuild for templates',
    );

    try {
      // Clear existing Redis data for specified tenants
      if (tenants.length > 0) {
        for (const tenant of tenants) {
          const tenantUser: IUserToken = {
            ...this.systemUser,
            tenant,
          };

          // Clear all templates for this tenant
          await this.clearTenantTemplates(tenantUser);
        }
      }

      this.logger.log(
        { tenants },
        'Redis projection rebuild completed for templates',
      );
    } catch (error) {
      this.logger.error(
        {
          tenants,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to rebuild Redis projection for templates',
      );
      throw error;
    }
  }

  /**
   * Clear all templates for a specific tenant
   */
  private async clearTenantTemplates(user: IUserToken): Promise<void> {
    try {
      // Get all template keys for the tenant
      const allTemplates =
        await this.redisUtilityService.getAllValues<SnapshotTemplateProps>(
          user,
          this.redisProjectionKey,
        );

      // Delete each template
      for (const template of allTemplates) {
        await this.redisUtilityService.delete(
          user,
          this.redisProjectionKey,
          template.code,
        );
      }

      this.logger.debug(
        { tenant: user.tenant, count: allTemplates.length },
        'Cleared all templates for tenant in Redis projection',
      );
    } catch (error) {
      this.logger.error(
        {
          tenant: user.tenant,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to clear tenant templates in Redis projection',
      );
      throw error;
    }
  }

  /**
   * Mark projection as initialized
   */
  markAsInitialized(): void {
    this.isInitialized = true;
    this.logger.log({}, 'Template Redis projection marked as initialized');
  }

  /**
   * Check if projection is ready for queries
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Health check for Redis connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test Redis connectivity with a simple operation
      const testUser: IUserToken = {
        ...this.systemUser,
        tenant: 'health-check',
      };

      await this.redisUtilityService.exists(
        testUser,
        this.redisProjectionKey,
        'health-check',
      );

      return this.isInitialized;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Redis projection health check failed',
      );
      return false;
    }
  }
}
