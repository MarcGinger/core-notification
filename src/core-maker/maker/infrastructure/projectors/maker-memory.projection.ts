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
import { SnapshotMakerProps } from '../../domain/properties';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';

/**
 * Maker memory projection service responsible for maintaining
 * an in-memory projection of maker entities from event streams.
 *
 * This projection enables efficient querying and listing operations
 * without having to replay events from individual streams.
 */
@Injectable()
export class MakerMemoryProjection {
  private readonly makerStore: Record<
    string,
    Record<string, SnapshotMakerProps>
  > = {};
  private isInitialized = false;

  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  /**
   * Handle maker events for the internal maker memory projection
   * Simplified since each event contains the complete aggregate state
   */
  async handleMakerEvent(
    evt: SnapshotMakerProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    try {
      // Ensure tenant store exists
      if (!this.makerStore[meta.tenant]) {
        this.makerStore[meta.tenant] = {};
      }

      // Extract maker data from the event (contains full aggregate state)
      const makerData = this.extractMakerFromEvent(evt, meta);

      // For delete events, makerData will be null and maker is already removed
      if (!makerData) {
        this.logger.debug(
          { evt, meta },
          'Maker data not extracted (likely delete event or invalid data)',
        );
        return;
      }

      // Simply store the complete current state - no merging needed
      this.makerStore[meta.tenant][makerData.id] = makerData;

      this.logger.debug(
        {
          tenant: meta.tenant,
          makerCode: makerData.id,
          eventType: meta.eventType,
          streamName: meta.stream,
          version: meta.version,
        },
        'Updated maker memory projection with complete aggregate state',
      );
      return new Promise<void>((resolve) => resolve());
    } catch (error) {
      this.logger.error(
        {
          evt,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to handle maker event in memory projection',
      );
    }
  }

  /**
   * Extract maker data from event - simplified since each event contains full aggregate
   */
  private extractMakerFromEvent(
    evt: SnapshotMakerProps,
    meta: EventStoreMetaProps,
  ): SnapshotMakerProps | null {
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
        'Failed to extract maker data from event',
      );
      return null;
    }
  }

  /**
   * Get a specific maker by tenant and id
   */
  getMakerStore(tenant: string, id: string): SnapshotMakerProps | null {
    try {
      const tenantStore = this.makerStore[tenant];
      if (!tenantStore) {
        this.logger.debug(
          { tenant, id },
          'No tenant store found for maker lookup',
        );
        return null;
      }

      const maker = tenantStore[id];
      if (!maker) {
        this.logger.debug({ tenant, id }, 'No maker found for code');
        return null;
      }

      return maker;
    } catch (error) {
      this.logger.error(
        {
          tenant,
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get maker from memory projection',
      );
      return null;
    }
  }

  /**
   * Get all makers for a tenant with optional filtering
   */
  async getMakersForTenant(
    tenant: string,
    filter?: {
      to?: string;
    },
  ): Promise<SnapshotMakerProps[]> {
    try {
      const tenantStore = this.makerStore[tenant];
      if (!tenantStore) {
        this.logger.debug(
          { tenant },
          'No tenant store found for makers lookup',
        );
        return [];
      }

      let makers = Object.values(tenantStore);

      // Apply filters
      if (filter) {
        if (filter.to) {
          const to = filter.to.toLowerCase();
          makers = makers.filter((c) => c.to.toLowerCase() === to);
        }
      }

      return new Promise((resolve) => resolve(makers));
    } catch (error) {
      this.logger.error(
        {
          tenant,
          filter,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get makers for tenant from memory projection',
      );
      return [];
    }
  }

  /**
   * Get makers by multiple ids efficiently
   */
  getMakersByCodes(tenant: string, ids: string[]): SnapshotMakerProps[] {
    try {
      const tenantStore = this.makerStore[tenant];
      if (!tenantStore) {
        return [];
      }

      const result: SnapshotMakerProps[] = [];
      for (const code of ids) {
        const maker = tenantStore[code];
        if (maker) {
          result.push(maker);
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
        'Failed to get makers by ids from memory projection',
      );
      return [];
    }
  }

  /**
   * Mark projection as initialized
   */
  markAsInitialized(): void {
    this.isInitialized = true;
    this.logger.log({}, 'Maker memory projection marked as initialized');
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
