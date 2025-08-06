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

interface ProcessingStats {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  processing: number;
}

interface ServiceStats {
  serviceContext: string;
  stats: ProcessingStats;
}

/**
 * Shared repository for managing processed events to prevent duplicate processing
 * across all notification services (Slack, Email, Teams, SMS, etc.)
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
   * Optionally filter by service context for service-specific deduplication
   */
  async isEventProcessed(
    streamName: string,
    revision: bigint,
    serviceContext?: string,
  ): Promise<boolean> {
    const whereClause: Record<string, string> = {
      streamName,
      revision: revision.toString(),
    };

    // For backwards compatibility, if serviceContext is provided, include it in the query
    // If not provided, check for any record regardless of serviceContext
    if (serviceContext) {
      whereClause.serviceContext = serviceContext;
    }

    const existingEvent = await this.repository.findOne({
      where: whereClause,
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
    serviceContext: string,
    processingStatus:
      | 'processing'
      | 'processed'
      | 'failed'
      | 'skipped' = 'processed',
  ): Promise<void> {
    const processedEvent = ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      sequence,
      serviceContext,
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
    serviceContext: string,
  ): Promise<void> {
    const processedEvent = ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      sequence,
      serviceContext,
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
    serviceContext: string,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): Promise<void> {
    await this.repository.update(
      {
        streamName,
        revision: sequence.toString(),
        serviceContext,
      },
      {
        processingStatus,
      },
    );
  }

  /**
   * Mark an event as failed
   */
  async markEventAsFailed(
    streamName: string,
    sequence: bigint,
    serviceContext: string,
  ): Promise<void> {
    await this.markEventAsProcessed(
      streamName,
      sequence,
      serviceContext,
      'failed',
    );
  }

  /**
   * Mark an event as skipped
   */
  async markEventAsSkipped(
    streamName: string,
    sequence: bigint,
    serviceContext: string,
  ): Promise<void> {
    await this.markEventAsProcessed(
      streamName,
      sequence,
      serviceContext,
      'skipped',
    );
  }

  /**
   * Get processing status for an event
   */
  async getEventProcessingStatus(
    streamName: string,
    revision: bigint,
    serviceContext?: string,
  ): Promise<ProcessedEventEntity | null> {
    const whereClause: Record<string, string> = {
      streamName,
      revision: revision.toString(),
    };

    if (serviceContext) {
      whereClause.serviceContext = serviceContext;
    }

    return await this.repository.findOne({
      where: whereClause,
    });
  }

  /**
   * Clean up old processed events (for maintenance)
   * Remove events older than the specified number of days
   * Optionally filter by service context
   */
  async cleanupOldEvents(
    daysToKeep: number = 30,
    serviceContext?: string,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const queryBuilder = this.repository
      .createQueryBuilder()
      .delete()
      .from(ProcessedEventEntity)
      .where('processedAt < :cutoffDate', { cutoffDate });

    if (serviceContext) {
      queryBuilder.andWhere('serviceContext = :serviceContext', {
        serviceContext,
      });
    }

    const result = await queryBuilder.execute();
    return result.affected || 0;
  }

  /**
   * Get statistics about processed events
   * Optionally filter by service context
   */
  async getProcessingStats(serviceContext?: string): Promise<ProcessingStats> {
    const queryBuilder = this.repository
      .createQueryBuilder('pe')
      .select('pe.processingStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pe.processingStatus');

    if (serviceContext) {
      queryBuilder.where('pe.serviceContext = :serviceContext', {
        serviceContext,
      });
    }

    const stats = await queryBuilder.getRawMany<{
      status: string;
      count: string;
    }>();

    const result: ProcessingStats = {
      total: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      processing: 0,
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
      } else if (stat.status === 'processing') {
        result.processing = count;
      }
    }

    return result;
  }

  /**
   * Get statistics grouped by service context
   */
  async getProcessingStatsByService(): Promise<ServiceStats[]> {
    const stats = await this.repository
      .createQueryBuilder('pe')
      .select('pe.serviceContext', 'serviceContext')
      .addSelect('pe.processingStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pe.serviceContext')
      .addGroupBy('pe.processingStatus')
      .getRawMany<{
        serviceContext: string;
        status: string;
        count: string;
      }>();

    const serviceStats = new Map<string, ProcessingStats>();

    for (const stat of stats) {
      const { serviceContext } = stat;
      if (!serviceStats.has(serviceContext)) {
        serviceStats.set(serviceContext, {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          processing: 0,
        });
      }

      const count = parseInt(stat.count, 10);
      const serviceResult = serviceStats.get(serviceContext)!;
      serviceResult.total += count;

      if (stat.status === 'processed') {
        serviceResult.processed = count;
      } else if (stat.status === 'failed') {
        serviceResult.failed = count;
      } else if (stat.status === 'skipped') {
        serviceResult.skipped = count;
      } else if (stat.status === 'processing') {
        serviceResult.processing = count;
      }
    }

    return Array.from(serviceStats.entries()).map(
      ([serviceContext, stats]): ServiceStats => ({
        serviceContext,
        stats,
      }),
    );
  }

  // Service-specific convenience methods

  /**
   * Slack service convenience methods
   */
  async isSlackEventProcessed(
    streamName: string,
    revision: bigint,
  ): Promise<boolean> {
    return this.isEventProcessed(streamName, revision, 'slack-worker');
  }

  async markSlackEventAsProcessing(
    streamName: string,
    sequence: bigint,
  ): Promise<void> {
    return this.markEventAsProcessing(streamName, sequence, 'slack-worker');
  }

  async markSlackEventAsProcessed(
    streamName: string,
    sequence: bigint,
    status: 'processed' | 'failed' | 'skipped' = 'processed',
  ): Promise<void> {
    return this.markEventAsProcessed(
      streamName,
      sequence,
      'slack-worker',
      status,
    );
  }

  async updateSlackEventStatus(
    streamName: string,
    sequence: bigint,
    status: 'processing' | 'processed' | 'failed' | 'skipped',
  ): Promise<void> {
    return this.updateEventStatus(streamName, sequence, 'slack-worker', status);
  }

  /**
   * Email service convenience methods
   */
  async isEmailEventProcessed(
    streamName: string,
    revision: bigint,
  ): Promise<boolean> {
    return this.isEventProcessed(streamName, revision, 'email-service');
  }

  async markEmailEventAsProcessing(
    streamName: string,
    sequence: bigint,
  ): Promise<void> {
    return this.markEventAsProcessing(streamName, sequence, 'email-service');
  }

  async markEmailEventAsProcessed(
    streamName: string,
    sequence: bigint,
    status: 'processed' | 'failed' | 'skipped' = 'processed',
  ): Promise<void> {
    return this.markEventAsProcessed(
      streamName,
      sequence,
      'email-service',
      status,
    );
  }

  /**
   * Teams service convenience methods
   */
  async isTeamsEventProcessed(
    streamName: string,
    revision: bigint,
  ): Promise<boolean> {
    return this.isEventProcessed(streamName, revision, 'teams-service');
  }

  async markTeamsEventAsProcessing(
    streamName: string,
    sequence: bigint,
  ): Promise<void> {
    return this.markEventAsProcessing(streamName, sequence, 'teams-service');
  }

  async markTeamsEventAsProcessed(
    streamName: string,
    sequence: bigint,
    status: 'processed' | 'failed' | 'skipped' = 'processed',
  ): Promise<void> {
    return this.markEventAsProcessed(
      streamName,
      sequence,
      'teams-service',
      status,
    );
  }

  /**
   * SMS service convenience methods
   */
  async isSmsEventProcessed(
    streamName: string,
    revision: bigint,
  ): Promise<boolean> {
    return this.isEventProcessed(streamName, revision, 'sms-service');
  }

  async markSmsEventAsProcessing(
    streamName: string,
    sequence: bigint,
  ): Promise<void> {
    return this.markEventAsProcessing(streamName, sequence, 'sms-service');
  }

  async markSmsEventAsProcessed(
    streamName: string,
    sequence: bigint,
    status: 'processed' | 'failed' | 'skipped' = 'processed',
  ): Promise<void> {
    return this.markEventAsProcessed(
      streamName,
      sequence,
      'sms-service',
      status,
    );
  }
}
