/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 */

import { Inject, Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { CreateMessageProps } from '../../domain/properties';
import { ProcessedEventRepository } from 'src/shared/infrastructure/event-processing';
import { MessageCreatedEventHandler } from '../../application/handlers';

/**
 * Infrastructure layer adapter for EventStore subscription events.
 * This is a thin adapter that handles infrastructure concerns and delegates
 * business logic to the application layer MessageCreatedEventHandler.
 *
 * Responsibilities:
 * - EventStore subscription management
 * - Event deduplication (infrastructure concern)
 * - Tenant extraction from stream metadata
 * - Delegation to application layer handlers
 */
@Injectable()
export class SendSlackMessageEventHandler {
  private isInitialized = false;
  private readonly systemUser: IUserToken;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly processedEventRepository: ProcessedEventRepository,
    private readonly messageCreatedEventHandler: MessageCreatedEventHandler,
  ) {
    // Create a system user for operations
    this.systemUser = {
      sub: 'system-slack-event-handler',
      preferred_username: 'system',
      name: 'System Slack Event Handler',
      email: 'system@internal',
      tenant: 'system',
      roles: ['system'],
    } as IUserToken;
  }

  /**
   * Infrastructure adapter method - handles EventStore events and delegates to application layer
   */
  async handleMessageEvent(
    eventData: CreateMessageProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    this.logger.log(
      {
        component: 'SendSlackMessageEventHandler',
        method: 'handleMessageEvent',
        eventType: meta.eventType,
        stream: meta.stream,
        revision: meta.revision?.toString(),
        messageId: meta.aggregateId,
      },
      'Infrastructure: Received event from EventStore subscription',
    );

    try {
      // Infrastructure Concern: Deduplication check
      if (!(await this.checkAndMarkEventForProcessing(meta))) {
        return; // Event already processed or being processed
      }

      // Infrastructure Concern: Event type validation
      if (!this.isMessageCreatedEvent(meta.eventType)) {
        await this.markEventAsSkipped(meta);
        return;
      }

      // Infrastructure Concern: Tenant extraction
      const tenant = this.extractTenant(meta);
      if (!tenant) {
        await this.markEventAsFailed(meta, 'No tenant found');
        return;
      }

      // Infrastructure Concern: Create tenant-specific user context
      const tenantUser: IUserToken = {
        ...this.systemUser,
        tenant,
      };

      // Delegate to Application Layer: This is where business logic happens
      const result = await this.messageCreatedEventHandler.handle(tenantUser, {
        eventData,
        aggregateId: meta.aggregateId,
        tenant,
        revision: meta.revision,
        correlationId: eventData.correlationId,
      });

      // Infrastructure Concern: Mark event as processed
      if (result.success) {
        await this.markEventAsProcessed(meta);
        this.logger.log(
          {
            messageId: meta.aggregateId,
            tenant,
            scheduled: result.scheduled,
          },
          'Infrastructure: Successfully processed MessageCreatedEvent',
        );
      } else {
        await this.markEventAsFailed(
          meta,
          'Application layer processing failed',
        );
      }
    } catch (error) {
      // Infrastructure Concern: Error handling and event marking
      await this.markEventAsFailed(
        meta,
        error instanceof Error ? error.message : 'Unknown error',
      );

      this.logger.error(
        {
          eventData,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Infrastructure: Failed to handle MessageCreatedEvent',
      );
      throw error;
    }
  }

  /**
   * Infrastructure Concern: Check event deduplication and mark for processing
   */
  private async checkAndMarkEventForProcessing(
    meta: EventStoreMetaProps,
  ): Promise<boolean> {
    if (meta.revision === undefined) {
      this.logger.warn(
        { eventData: meta },
        'Infrastructure: No revision available - cannot perform deduplication',
      );
      return true; // Continue processing but log the issue
    }

    const aggregateStream = meta.stream;
    const alreadyProcessed =
      await this.processedEventRepository.isSlackEventProcessed(
        aggregateStream,
        meta.revision,
      );

    if (alreadyProcessed) {
      this.logger.debug(
        {
          aggregateStream,
          revision: meta.revision.toString(),
          aggregateId: meta.aggregateId,
        },
        'Infrastructure: Event already processed - skipping to prevent duplicate',
      );
      return false;
    }

    // Mark as processing to prevent race conditions
    try {
      await this.processedEventRepository.markSlackEventAsProcessing(
        aggregateStream,
        meta.revision,
      );
      return true;
    } catch (error) {
      this.logger.debug(
        {
          revision: meta.revision.toString(),
          aggregateStream,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Infrastructure: Could not mark event as processing - likely already being processed',
      );
      return false;
    }
  }

  /**
   * Infrastructure Concern: Event type validation
   */
  private isMessageCreatedEvent(eventType: string): boolean {
    return eventType.toLowerCase().includes('slack.message.created.v1');
  }

  /**
   * Infrastructure Concern: Extract tenant from EventStore metadata
   */
  private extractTenant(meta: EventStoreMetaProps): string | null {
    // Try tenant from metadata first
    if (meta.tenant) {
      return meta.tenant;
    }

    // Extract from stream name as fallback
    return this.extractTenantFromStream(meta.stream);
  }

  /**
   * Infrastructure Concern: Extract tenant from stream name
   */
  private extractTenantFromStream(streamName: string): string | null {
    try {
      const parts = streamName.split('-');
      if (parts.length >= 2) {
        return parts[1]; // Assuming tenant is second part after first dash
      }
      return null;
    } catch (error) {
      this.logger.error(
        { streamName, error },
        'Infrastructure: Failed to extract tenant from stream name',
      );
      return null;
    }
  }

  /**
   * Infrastructure Concern: Mark event as processed
   */
  private async markEventAsProcessed(meta: EventStoreMetaProps): Promise<void> {
    if (meta.revision !== undefined) {
      const eventTypeStream = '$et-slack.message.created.v1';
      await this.processedEventRepository.updateSlackEventStatus(
        eventTypeStream,
        meta.revision,
        'processed',
      );
    }
  }

  /**
   * Infrastructure Concern: Mark event as skipped
   */
  private async markEventAsSkipped(meta: EventStoreMetaProps): Promise<void> {
    if (meta.revision !== undefined) {
      await this.processedEventRepository.markSlackEventAsProcessed(
        meta.stream,
        meta.revision,
        'skipped',
      );
    }
  }

  /**
   * Infrastructure Concern: Mark event as failed
   */
  private async markEventAsFailed(
    meta: EventStoreMetaProps,
    reason: string,
  ): Promise<void> {
    if (meta.revision !== undefined) {
      try {
        const eventTypeStream = '$et-slack.message.created.v1';
        await this.processedEventRepository.updateSlackEventStatus(
          eventTypeStream,
          meta.revision,
          'failed',
        );
      } catch (updateError) {
        this.logger.error(
          {
            revision: meta.revision.toString(),
            reason,
            error:
              updateError instanceof Error
                ? updateError.message
                : 'Unknown error',
          },
          'Infrastructure: Failed to update event status to failed',
        );
      }
    }
  }

  /**
   * Infrastructure Concern: Mark handler as initialized
   */
  markAsInitialized(): void {
    this.isInitialized = true;
    this.logger.log(
      { component: 'SendSlackMessageEventHandler', initialized: true },
      'Infrastructure: Event handler marked as initialized',
    );
  }

  /**
   * Infrastructure Concern: Health checks
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  isHealthy(): boolean {
    return this.isInitialized;
  }
}
