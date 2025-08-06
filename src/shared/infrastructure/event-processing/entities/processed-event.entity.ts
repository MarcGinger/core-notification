/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Shared ProcessedEvent entity for tracking which events have been processed
 * to prevent duplicate processing on service restarts across all notification services.
 * Uses composite primary key of streamName + revision for deduplication.
 *
 * This entity can be used by various notification services:
 * - Slack worker
 * - Email service
 * - Teams service
 * - SMS service
 * - etc.
 */
@Entity({ name: 'processed_events', schema: 'core_slack_worker' })
export class ProcessedEventEntity {
  // Core deduplication fields - composite primary key
  @PrimaryColumn('varchar', { length: 500 })
  streamName: string; // e.g., '$et-slack.message.created.v1', '$et-email.message.created.v1'

  @PrimaryColumn('varchar', { length: 50 })
  revision: string; // EventStore revision number (stored as string to handle large bigint values)

  // Service context for multi-service tracking
  @Column('varchar', { length: 100, nullable: true, default: 'slack-worker' })
  serviceContext: string; // e.g., 'slack-worker', 'email-service', 'teams-service'

  // Minimal metadata for debugging
  @Column('varchar', { length: 50 })
  processingStatus: 'processing' | 'processed' | 'failed' | 'skipped';

  @CreateDateColumn()
  processedAt: Date;

  constructor(
    streamName?: string,
    revision?: string,
    serviceContext?: string,
    processingStatus?: 'processing' | 'processed' | 'failed' | 'skipped',
  ) {
    if (streamName) this.streamName = streamName;
    if (revision) this.revision = revision;
    if (serviceContext) this.serviceContext = serviceContext;
    if (processingStatus) this.processingStatus = processingStatus;
  }

  /**
   * Create a ProcessedEventEntity from EventStore metadata
   */
  static fromEventStoreMeta(
    streamName: string,
    revision: bigint,
    serviceContext: string,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): ProcessedEventEntity {
    return new ProcessedEventEntity(
      streamName,
      revision.toString(), // Convert bigint to string for storage
      serviceContext,
      processingStatus,
    );
  }

  /**
   * Create entity for slack service
   */
  static forSlackService(
    streamName: string,
    revision: bigint,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): ProcessedEventEntity {
    return ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      revision,
      'slack-worker',
      processingStatus,
    );
  }

  /**
   * Create entity for email service
   */
  static forEmailService(
    streamName: string,
    revision: bigint,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): ProcessedEventEntity {
    return ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      revision,
      'email-service',
      processingStatus,
    );
  }

  /**
   * Create entity for teams service
   */
  static forTeamsService(
    streamName: string,
    revision: bigint,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): ProcessedEventEntity {
    return ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      revision,
      'teams-service',
      processingStatus,
    );
  }

  /**
   * Create entity for SMS service
   */
  static forSmsService(
    streamName: string,
    revision: bigint,
    processingStatus: 'processing' | 'processed' | 'failed' | 'skipped',
  ): ProcessedEventEntity {
    return ProcessedEventEntity.fromEventStoreMeta(
      streamName,
      revision,
      'sms-service',
      processingStatus,
    );
  }
}
