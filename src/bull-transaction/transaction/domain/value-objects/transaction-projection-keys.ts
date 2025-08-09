/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { BullTransactionServiceConstants } from '../../../shared/domain/value-objects';

/**
 * Domain value object for Transaction projection keys
 * Centralizes all key patterns to prevent duplication and ensure consistency
 * Follows DDD principle of explicit domain concepts
 */
export class TransactionProjectionKeys {
  // EventStore DB patterns
  static readonly ESDB_BOUNDED_CONTEXT =
    BullTransactionServiceConstants.BOUNDED_CONTEXT;
  static readonly ESDB_AGGREGATE_NAME = 'transaction';
  static readonly ESDB_VERSION = 'v1';

  /**
   * Get EventStore stream prefix for individual streams
   * Format: core-transaction.transaction.v1
   */
  static getEventStoreStreamPrefix(): string {
    return `${this.ESDB_BOUNDED_CONTEXT}.${this.ESDB_AGGREGATE_NAME}.${this.ESDB_VERSION}`;
  }

  /**
   * Get EventStore category projection pattern for catchup
   * Format: $ce-core-transaction.transaction.v1
   */
  static getEventStoreCategoryPattern(): string {
    return `$ce-${this.getEventStoreStreamPrefix()}`;
  }

  /**
   * Get individual EventStore stream name for specific tenant and code
   * Format: core-transaction.transaction.v1-{tenant}-{code}
   */
  static getEventStoreStreamName(tenant: string, code: string): string {
    return `${this.getEventStoreStreamPrefix()}-${tenant}-${code}`;
  }

  /**
   * Extract tenant and code from EventStore stream name
   * Validates format: core-transaction.transaction.v1-{tenant}-{code}
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
   * Validate if stream name matches transaction pattern
   */
  static isTransactionStream(streamName: string): boolean {
    return this.extractFromStreamName(streamName) !== null;
  }

  /**
   * Get stream pattern for tenant-specific catchup
   * Format: core-transaction.transaction.v1-{tenant}-*
   */
  static getTenantStreamPattern(tenant: string): string {
    return `${this.getEventStoreStreamPrefix()}-${tenant}-*`;
  }

  /**
   * Get global stream pattern for all tenants
   * Format: core-transaction.transaction.v1-*
   */
  static getGlobalStreamPattern(): string {
    return `${this.getEventStoreStreamPrefix()}-*`;
  }
}
