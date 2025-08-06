/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEventEntity } from '../entities';

/**
 * Repository for managing processed events to prevent duplicate processing
 * Uses EventStore sequence numbers for accurate deduplication
 */
@Injectable()
export class ProcessedEventRepository {
  constructor(
    @InjectRepository(ProcessedEventEntity)
    private readonly repository: Repository<ProcessedEventEntity>,
  ) {}

  /**
   * Check if an event has already been processed based on stream and sequence
   * Returns true if the event is processed, failed, or skipped (but not if it's still processing)
   */
  async isEventProcessed(
    streamName: string,
    revision: bigint,
  ): Promise<boolean> {
    const existingEvent = await this.repository.findOne({
      where: {
        streamName,
        revision: revision.toString(),
      },
    });

    // Consider event as processed if it exists and is not in 'processing' state
    return (
      existingEvent !== null && existingEvent.processingStatus !== 'processing'
    );
  }

  /**
   * Mark an event as processed
   */
  async markEventAsProcessed(
    streamName: string,
    sequence: bigint,
    processingStatus:
      | 'processing'
      | 'processed'
      | 'failed'
      | 'skipped' = 'processed',
  ): Promise<void> {
    const processedEvent = ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      sequence,
      processingStatus,
    );

    await this.repository.save(processedEvent);
  }

  /**
   * Mark an event as processing to prevent race conditions
   * This uses INSERT to ensure only one process can mark an event as processing
   */
  async markEventAsProcessing(
    streamName: string,
    sequence: bigint,
  ): Promise<void> {
    const processedEvent = ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      sequence,
      'processing',
    );

    // Use insert instead of save to ensure atomic operation and get constraint violation if already exists
    await this.repository.insert(processedEvent);
  }

  /**
   * Update the processing status of an existing event
   */
  async updateEventStatus(
    streamName: string,
    sequence: bigint,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): Promise<void> {
    await this.repository.update(
      {
        streamName,
        revision: sequence.toString(),
      },
      {
        processingStatus,
      },
    );
  }

  /**
   * Mark an event as failed
   */
  async markEventAsFailed(streamName: string, sequence: bigint): Promise<void> {
    await this.markEventAsProcessed(streamName, sequence, 'failed');
  }

  /**
   * Mark an event as skipped
   */
  async markEventAsSkipped(
    streamName: string,
    sequence: bigint,
  ): Promise<void> {
    await this.markEventAsProcessed(streamName, sequence, 'skipped');
  }

  /**
   * Get processing status for an event
   */
  async getEventProcessingStatus(
    streamName: string,
    revision: bigint,
  ): Promise<ProcessedEventEntity | null> {
    return await this.repository.findOne({
      where: {
        streamName,
        revision: revision.toString(),
      },
    });
  }

  /**
   * Clean up old processed events (for maintenance)
   * Remove events older than the specified number of days
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(ProcessedEventEntity)
      .where('processedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get statistics about processed events
   */
  async getProcessingStats(): Promise<{
    total: number;
    processed: number;
    failed: number;
    skipped: number;
  }> {
    const stats = await this.repository
      .createQueryBuilder('pe')
      .select('pe.processingStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pe.processingStatus')
      .getRawMany<{ status: string; count: string }>();

    const result = {
      total: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const stat of stats) {
      const count = parseInt(stat.count, 10);
      result.total += count;

      if (stat.status === 'processed') {
        result.processed = count;
      } else if (stat.status === 'failed') {
        result.failed = count;
      } else if (stat.status === 'skipped') {
        result.skipped = count;
      }
    }

    return result;
  }
}
