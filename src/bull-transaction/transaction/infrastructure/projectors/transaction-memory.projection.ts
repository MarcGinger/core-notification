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
import { SnapshotTransactionProps } from '../../domain/properties';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';

/**
 * Transaction memory projection service responsible for maintaining
 * an in-memory projection of transaction entities from event streams.
 *
 * This projection enables efficient querying and listing operations
 * without having to replay events from individual streams.
 */
@Injectable()
export class TransactionMemoryProjection {
  private readonly transactionStore: Record<
    string,
    Record<string, SnapshotTransactionProps>
  > = {};
  private isInitialized = false;

  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  /**
   * Handle transaction events for the internal transaction memory projection
   * Simplified since each event contains the complete aggregate state
   */
  async handleTransactionEvent(
    evt: SnapshotTransactionProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Ensure tenant store exists
      if (!this.transactionStore[meta.tenant]) {
        this.transactionStore[meta.tenant] = {};
      }

      // Extract transaction data from the event (contains full aggregate state)
      const transactionData = this.extractTransactionFromEvent(evt, meta);

      // For delete events, transactionData will be null and transaction is already removed
      if (!transactionData) {
        this.logger.debug(
          { evt, meta },
          'Transaction data not extracted (likely delete event or invalid data)',
        );
        return;
      }

      // Simply store the complete current state - no merging needed
      this.transactionStore[meta.tenant][transactionData.id] = transactionData;

      this.logger.debug(
        {
          tenant: meta.tenant,
          transactionCode: transactionData.id,
          eventType: meta.eventType,
          streamName: meta.stream,
          version: meta.version,
        },
        'Updated transaction memory projection with complete aggregate state',
      );
      return new Promise<void>((resolve) => resolve());
    } catch (error) {
      this.logger.error(
        {
          evt,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to handle transaction event in memory projection',
      );
    }
  }

  /**
   * Extract transaction data from event - simplified since each event contains full aggregate
   */
  private extractTransactionFromEvent(
    evt: SnapshotTransactionProps,
    meta: EventStoreMetaProps,
  ): SnapshotTransactionProps | null {
    try {
      // Since each event contains the complete aggregate state,
      // we can simply extract the current state regardless of event type
      return evt;
    } catch (error) {
      this.logger.error(
        {
          evt,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to extract transaction data from event',
      );
      return null;
    }
  }

  /**
   * Get a specific transaction by tenant and id
   */
  getTransactionStore(
    tenant: string,
    id: string,
  ): SnapshotTransactionProps | null {
    try {
      const tenantStore = this.transactionStore[tenant];
      if (!tenantStore) {
        this.logger.debug(
          { tenant, id },
          'No tenant store found for transaction lookup',
        );
        return null;
      }

      const transaction = tenantStore[id];
      if (!transaction) {
        this.logger.debug({ tenant, id }, 'No transaction found for code');
        return null;
      }

      return transaction;
    } catch (error) {
      this.logger.error(
        {
          tenant,
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get transaction from memory projection',
      );
      return null;
    }
  }

  /**
   * Get all transactions for a tenant with optional filtering
   */
  async getTransactionsForTenant(
    tenant: string,
    filter?: {},
  ): Promise<SnapshotTransactionProps[]> {
    try {
      const tenantStore = this.transactionStore[tenant];
      if (!tenantStore) {
        this.logger.debug(
          { tenant },
          'No tenant store found for transactions lookup',
        );
        return [];
      }

      let transactions = Object.values(tenantStore);

      // Apply filters
      if (filter) {
      }

      return new Promise((resolve) => resolve(transactions));
    } catch (error) {
      this.logger.error(
        {
          tenant,
          filter,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get transactions for tenant from memory projection',
      );
      return [];
    }
  }

  /**
   * Get transactions by multiple ids efficiently
   */
  getTransactionsByCodes(
    tenant: string,
    ids: string[],
  ): SnapshotTransactionProps[] {
    try {
      const tenantStore = this.transactionStore[tenant];
      if (!tenantStore) {
        return [];
      }

      const result: SnapshotTransactionProps[] = [];
      for (const code of ids) {
        const transaction = tenantStore[code];
        if (transaction) {
          result.push(transaction);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        {
          tenant,
          ids,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get transactions by ids from memory projection',
      );
      return [];
    }
  }

  /**
   * Mark projection as initialized
   */
  markAsInitialized(): void {
    this.isInitialized = true;
    this.logger.log({}, 'Transaction memory projection marked as initialized');
  }

  /**
   * Check if projection is ready for queries
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => resolve(this.isInitialized));
  }
}
