/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CoreTemplateManagerServiceConstants } from '../../../shared/domain/value-objects';

/**
 * Domain value object for Template projection keys
 * Centralizes all key patterns to prevent duplication and ensure consistency
 * Follows DDD principle of explicit domain concepts
 */
export class TemplateProjectionKeys {
  // EventStore DB patterns
  static readonly ESDB_BOUNDED_CONTEXT =
    CoreTemplateManagerServiceConstants.BOUNDED_CONTEXT;
  static readonly ESDB_AGGREGATE_NAME = 'template';
  static readonly ESDB_VERSION = 'v1';

  // Redis projection patterns
  static readonly REDIS_LOOKUP_PREFIX = 'core:slack';
  static readonly REDIS_AGGREGATE_NAME = 'config';
  static readonly REDIS_VERSION = 'v1';

  /**
   * Get Redis projection key
   * Format: lookups:core.template.v1
   */
  static getRedisProjectionKey(): string {
    return `${this.REDIS_LOOKUP_PREFIX}.${this.REDIS_AGGREGATE_NAME}.${this.REDIS_VERSION}`;
  }

  /**
   * Get EventStore stream prefix for individual streams
   * Format: core-slack.template.v1
   */
  static getEventStoreStreamPrefix(): string {
    return `${this.ESDB_BOUNDED_CONTEXT}.${this.ESDB_AGGREGATE_NAME}.${this.ESDB_VERSION}`;
  }

  /**
   * Get EventStore category projection pattern for catchup
   * Format: $ce-core-slack.template.v1
   */
  static getEventStoreCategoryPattern(): string {
    return `$ce-${this.getEventStoreStreamPrefix()}`;
  }

  /**
   * Get individual EventStore stream name for specific tenant and code
   * Format: core-slack.template.v1-{tenant}-{code}
   */
  static getEventStoreStreamName(tenant: string, code: string): string {
    return `${this.getEventStoreStreamPrefix()}-${tenant}-${code}`;
  }

  /**
   * Extract tenant and code from EventStore stream name
   * Validates format: core-slack.template.v1-{tenant}-{code}
   */
  static extractFromStreamName(
    streamName: string,
  ): { tenant: string; code: string } | null {
    const prefix = this.getEventStoreStreamPrefix();
    const pattern = new RegExp(
      `^${prefix.replace(/\./g, '\\.')}-([^-]+)-(.+)$`,
    );
    const match = streamName.match(pattern);

    if (!match) {
      return null;
    }

    const [, tenant, code] = match;
    return { tenant, code };
  }

  /**
   * Validate if stream name matches template pattern
   */
  static isTemplateStream(streamName: string): boolean {
    return this.extractFromStreamName(streamName) !== null;
  }

  /**
   * Get stream pattern for tenant-specific catchup
   * Format: core-slack.template.v1-{tenant}-*
   */
  static getTenantStreamPattern(tenant: string): string {
    return `${this.getEventStoreStreamPrefix()}-${tenant}-*`;
  }

  /**
   * Get global stream pattern for all tenants
   * Format: core-slack.template.v1-*
   */
  static getGlobalStreamPattern(): string {
    return `${this.getEventStoreStreamPrefix()}-*`;
  }
}
