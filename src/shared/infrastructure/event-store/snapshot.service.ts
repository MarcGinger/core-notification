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
import { Subscription } from 'rxjs';
import { ILogger } from 'src/shared/logger';
import { EsdbEventStore } from './esdb-event-store';
import {
  EventStoreMetaProps,
  StoreSubscriptionOptions,
} from './event-store.model';

@Injectable()
export class SnapshotService {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly esdb: EsdbEventStore<any>,
  ) {}

  /**
   * Gets the latest (most recent) snapshot from a stream.
   * Reads backwards from the end of the stream to get the most recent snapshot.
   * @template T The snapshot data type
   * @param {string} stream - The stream name to read the latest snapshot from
   * @returns {Promise<T | null>} Promise resolving to the latest snapshot or null if none exists
   */
  async getLatestSnapshot<T>(stream: string): Promise<T | null> {
    return await this.esdb.getLatestSnapshot<T>(stream);
  }

  /**
   * Gets the first (oldest) snapshot from a stream.
   * Reads forwards from the beginning of the stream to get the first snapshot.
   * @template T The snapshot data type
   * @param {string} stream - The stream name to read the first snapshot from
   * @returns {Promise<T | null>} Promise resolving to the first snapshot or null if none exists
   */
  async getFirstSnapshot<T>(stream: string): Promise<T | null> {
    const events = await this.esdb.list<T>(stream, {
      limit: 1,
      fromPosition: undefined, // Start from beginning
    });
    return events.length > 0 ? events[0] : null;
  }

  async saveSnapshot<T>(
    stream: string,
    type: string,
    snapshot: T,
  ): Promise<void> {
    await this.esdb.appendToStream({
      stream, // ✅ Complete stream name from caller
      type,
      event: snapshot as Partial<T>,
    });
  }

  /**
   * Set up a catchup subscription for a stream pattern.
   * This will first catch up on historical events, then subscribe to live events.
   * @template T The event data type
   * @param {string} stream - The stream name or pattern to subscribe to
   * @param {(event: T, meta: EventStoreMetaProps) => void} onEvent - Event handler function
   * @returns {Promise<Subscription>} Promise resolving to the subscription
   */
  async setupCatchupSubscription<T>(
    stream: string,
    onEvent: (event: T, meta: EventStoreMetaProps) => void,
  ): Promise<Subscription> {
    this.logger.debug({ stream }, 'Setting up catchup subscription for stream');

    try {
      // First, catch up on historical events
      const lastRevision = await this.esdb.catchupStream(stream, {
        onEvent,
      });

      this.logger.debug(
        { stream, lastRevision: lastRevision?.toString() },
        'Catchup completed, starting live subscription',
      );

      // Then subscribe to live events from where catchup left off
      const subscription = this.esdb.subscribeToStream(stream, {
        fromSequence: lastRevision,
        onEvent,
      });

      this.logger.debug(
        { stream },
        'Live subscription established successfully',
      );

      return subscription;
    } catch (error) {
      this.logger.error(
        {
          stream,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to setup catchup subscription',
      );
      throw error;
    }
  }

  /**
   * Set up a live-only subscription for a stream (no catchup).
   * @template T The event data type
   * @param {string} stream - The stream name to subscribe to
   * @param {StoreSubscriptionOptions<T>} options - Subscription options
   * @returns {Subscription} The subscription
   */
  subscribeToStream<T>(
    stream: string,
    options: StoreSubscriptionOptions<T>,
  ): Subscription {
    this.logger.debug(
      { stream, fromSequence: options.fromSequence?.toString() },
      'Setting up live subscription for stream',
    );

    return this.esdb.subscribeToStream(stream, options);
  }

  /**
   * Perform catchup only on a stream (no live subscription).
   * @template T The event data type
   * @param {string} stream - The stream name to catch up on
   * @param {(event: T, meta: EventStoreMetaProps) => void} onEvent - Event handler function
   * @returns {Promise<bigint | undefined>} Promise resolving to the last processed revision
   */
  async catchupStream<T>(
    stream: string,
    onEvent: (event: T, meta: EventStoreMetaProps) => void,
  ): Promise<bigint | undefined> {
    this.logger.debug({ stream }, 'Starting catchup for stream');

    try {
      const lastRevision = await this.esdb.catchupStream(stream, {
        onEvent,
      });

      this.logger.debug(
        { stream, lastRevision: lastRevision?.toString() },
        'Catchup completed successfully',
      );

      return lastRevision;
    } catch (error) {
      this.logger.error(
        {
          stream,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to catchup stream',
      );
      throw error;
    }
  }
}
