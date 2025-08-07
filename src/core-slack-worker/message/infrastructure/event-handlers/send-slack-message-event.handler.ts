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
import { CommandBus } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { Message } from '../../domain/aggregates';
import { MessageStatusEnum } from '../../domain/entities';
import { MessageCreatedEvent } from '../../domain/events';
import { CreateMessageProps } from '../../domain/properties';
import { MessageRepository } from '../repositories';
import { ProcessedEventRepository } from 'src/shared/infrastructure/event-processing';
import {
  RenderMessageTemplateCommand,
  QueueSlackMessageCommand,
} from '../../application/commands';
import { SlackMessageJobData } from '../processors/slack-message.processor';

/**
 * Send Slack Message Event Handler responsible for processing
 * MessageCreatedEvent events and creating queue commands without new message creation.
 *
 * This handler bridges the event-driven flow to the command pattern
 * by listening to MessageCreatedEvent and executing QueueSlackMessageCommand directly.
 */
@Injectable()
export class SendSlackMessageEventHandler {
  private isInitialized = false;
  private readonly systemUser: IUserToken;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
    private readonly processedEventRepository: ProcessedEventRepository,
    private readonly messageRepository: MessageRepository,
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE)
    private readonly slackQueue: Queue<SlackMessageJobData>,
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
   * Handle MessageCreatedEvent events and create commands
   * This method processes the event payload and executes CreateSendSlackMessageCommand
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
        version: meta.version,
        revision: meta.revision?.toString(),
        revisionType: typeof meta.revision,
        revisionUndefined: meta.revision === undefined,
        revisionNull: meta.revision === null,
        eventReceived: true,
      },
      'Event received from EventStore subscription',
    );

    try {
      // Check if revision is available for deduplication
      if (meta.revision === undefined) {
        this.logger.warn(
          { eventData, meta },
          'No revision number available - cannot perform deduplication',
        );
        // Continue processing but log the issue
      } else {
        this.logger.log(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'DEDUPLICATION_CHECK_START',
            revision: meta.revision.toString(),
            revisionType: typeof meta.revision,
            messageId: meta.aggregateId,
          },
          'DEBUG: Starting deduplication check',
        );

        // Check if this event has already been processed to prevent duplicates
        // Use the individual aggregate stream for proper deduplication
        const aggregateStream = meta.stream;

        const alreadyProcessed =
          await this.processedEventRepository.isSlackEventProcessed(
            aggregateStream,
            meta.revision,
          );

        this.logger.log(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'DEDUPLICATION_CHECK_RESULT',
            revision: meta.revision.toString(),
            aggregateStream,
            alreadyProcessed,
            messageId: meta.aggregateId,
          },
          'DEBUG: Deduplication check completed',
        );

        if (alreadyProcessed) {
          this.logger.debug(
            {
              eventType: meta.eventType,
              aggregateStream: aggregateStream,
              individualStream: meta.stream,
              revision: meta.revision.toString(),
              aggregateId: meta.aggregateId,
            },
            'Event already processed - skipping to prevent duplicate Slack message',
          );
          return;
        }

        // Mark as processing BEFORE sending Slack message to prevent race conditions
        try {
          this.logger.log(
            {
              component: 'SendSlackMessageEventHandler',
              debugPoint: 'MARK_AS_PROCESSING_START',
              revision: meta.revision.toString(),
              aggregateStream,
              messageId: meta.aggregateId,
            },
            'DEBUG: About to mark event as processing',
          );

          await this.processedEventRepository.markSlackEventAsProcessing(
            aggregateStream,
            meta.revision,
          );

          this.logger.debug(
            {
              revision: meta.revision.toString(),
              aggregateStream,
              markedAsProcessing: true,
            },
            'Successfully marked event as processing to prevent race conditions',
          );
        } catch (error) {
          // If we can't mark as processing (likely duplicate), skip this event
          this.logger.debug(
            {
              revision: meta.revision.toString(),
              aggregateStream,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Could not mark event as processing - likely already being processed by another handler',
          );
          return;
        }
      }

      // Check if this is a MessageCreatedEvent
      this.logger.log(
        {
          component: 'SendSlackMessageEventHandler',
          debugPoint: 'EVENT_TYPE_CHECK',
          eventType: meta.eventType,
          expectedEventType: MessageCreatedEvent.EVENT_TYPE,
          isMessageCreatedEvent: this.isMessageCreatedEvent(meta.eventType),
          messageId: meta.aggregateId,
        },
        'DEBUG: Checking if event is MessageCreatedEvent',
      );

      if (!this.isMessageCreatedEvent(meta.eventType)) {
        if (meta.revision !== undefined) {
          await this.processedEventRepository.markSlackEventAsProcessed(
            meta.stream,
            meta.revision,
            'skipped',
          );
        }

        this.logger.debug(
          { eventType: meta.eventType, streamName: meta.stream },
          'Skipping non-MessageCreatedEvent event',
        );
        return;
      }

      // Extract tenant from metadata or stream
      const tenant = meta.tenant || this.extractTenantFromStream(meta.stream);

      this.logger.log(
        {
          component: 'SendSlackMessageEventHandler',
          debugPoint: 'TENANT_EXTRACTION',
          metaTenant: meta.tenant,
          extractedTenant: this.extractTenantFromStream(meta.stream),
          finalTenant: tenant,
          streamName: meta.stream,
          messageId: meta.aggregateId,
        },
        'DEBUG: Tenant extraction completed',
      );

      if (!tenant) {
        if (meta.revision) {
          await this.processedEventRepository.markSlackEventAsProcessed(
            meta.stream,
            meta.revision,
            'failed',
          );
        }

        this.logger.warn(
          { eventData, meta },
          'No tenant found in event metadata, skipping command creation',
        );
        return;
      }

      // Create tenant-specific user context for command execution
      const tenantUser: IUserToken = {
        ...this.systemUser,
        tenant,
      };

      this.logger.debug(
        {
          tenant,
          messageId: meta.aggregateId,
          correlationId: eventData.correlationId,
          eventType: meta.eventType,
          streamName: meta.stream,
          revision: meta.revision?.toString(),
          version: meta.version,
        },
        'Processing MessageCreatedEvent - triggering Slack delivery',
      );

      // Add extensive debugging for the failing case
      this.logger.log(
        {
          component: 'SendSlackMessageEventHandler',
          method: 'handleMessageEvent',
          debugPoint: 'ABOUT_TO_PROCESS_MESSAGE',
          tenant,
          messageId: meta.aggregateId,
          correlationId: eventData.correlationId,
          channel: eventData.channel,
          isScheduled: !!eventData.scheduledAt,
          hasTemplateCode: !!eventData.templateCode,
        },
        'DEBUG: About to start message processing pipeline',
      );

      // Check if this is a scheduled message
      if (eventData.scheduledAt) {
        this.logger.log(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'SCHEDULED_MESSAGE_CHECK',
            scheduledAt: eventData.scheduledAt,
            messageId: meta.aggregateId,
          },
          'DEBUG: Processing scheduled message',
        );

        const scheduledDate = new Date(eventData.scheduledAt);
        const now = new Date();

        if (scheduledDate > now) {
          // This is a scheduled message - handle via QueueSlackMessageCommand
          await this.handleScheduledMessage(
            tenantUser,
            eventData,
            meta,
            scheduledDate,
          );

          // Mark event as processed since we've scheduled it
          if (meta.revision !== undefined) {
            const eventTypeStream = '$et-slack.message.created.v1';
            await this.processedEventRepository.updateSlackEventStatus(
              eventTypeStream,
              meta.revision,
              'processed',
            );
            this.logger.debug(
              {
                revision: meta.revision.toString(),
                eventTypeStream,
                scheduledAt: scheduledDate.toISOString(),
                delay: scheduledDate.getTime() - now.getTime(),
              },
              'Scheduled message queued for future delivery',
            );
          }
          return;
        }
        // If scheduled time is in the past or very soon, process immediately
      }

      this.logger.log(
        {
          component: 'SendSlackMessageEventHandler',
          debugPoint: 'ABOUT_TO_RENDER_TEMPLATE',
          messageId: meta.aggregateId,
          templateCode: eventData.templateCode,
          hasTemplateCode: !!eventData.templateCode,
        },
        'DEBUG: About to render message template',
      );

      // Create Slack delivery data from message event
      // Use meta.aggregateId as messageId (this is the aggregate ID from EventStore)
      let renderedMessage = 'Message content'; // Default fallback

      // Render message using template if templateCode is provided
      if (eventData.templateCode) {
        this.logger.log(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'RENDERING_TEMPLATE',
            templateCode: eventData.templateCode,
            messageId: meta.aggregateId,
          },
          'DEBUG: Rendering template',
        );

        try {
          const renderCommand = new RenderMessageTemplateCommand({
            templateCode: eventData.templateCode,
            payload: eventData.payload,
            channel: eventData.channel,
            tenant,
            configCode: eventData.configCode,
            correlationId: eventData.correlationId || 'unknown',
          });
          renderedMessage = await this.commandBus.execute(renderCommand);

          this.logger.log(
            {
              component: 'SendSlackMessageEventHandler',
              debugPoint: 'TEMPLATE_RENDERED_SUCCESS',
              templateCode: eventData.templateCode,
              messageId: meta.aggregateId,
              renderedLength: renderedMessage.length,
            },
            'DEBUG: Template rendered successfully',
          );
        } catch (error) {
          this.logger.warn(
            {
              templateCode: eventData.templateCode,
              tenant,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Failed to render message template - using fallback message',
          );
          // renderedMessage already has the fallback value
        }
      } else if (eventData.renderedMessage) {
        // Use pre-rendered message if available
        renderedMessage = eventData.renderedMessage;
        this.logger.log(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'USING_PRE_RENDERED',
            messageId: meta.aggregateId,
            renderedLength: renderedMessage.length,
          },
          'DEBUG: Using pre-rendered message',
        );
      }

      this.logger.log(
        {
          component: 'SendSlackMessageEventHandler',
          debugPoint: 'ABOUT_TO_QUEUE_EXISTING_MESSAGE',
          messageId: meta.aggregateId,
          renderedMessageLength: renderedMessage.length,
          channel: eventData.channel,
        },
        'DEBUG: About to load existing message and queue it directly',
      );

      // Load the existing message aggregate and queue it directly (no new message creation)
      try {
        const existingMessage = await this.messageRepository.getMessage(
          tenantUser,
          meta.aggregateId,
        );
        const messageAggregate = Message.fromEntity(existingMessage);

        // Add the message to BullMQ queue directly
        const jobOptions = {
          priority: QUEUE_PRIORITIES.HIGH,
          delay: eventData.scheduledAt
            ? Math.max(
                0,
                new Date(eventData.scheduledAt).getTime() - Date.now(),
              )
            : 0,
          attempts: 4,
          backoff: {
            type: 'exponential' as const,
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        };

        const job = await this.slackQueue.add(
          'deliver-slack-message',
          {
            messageId: meta.aggregateId, // Use existing message ID
            tenant: tenant || 'unknown',
            channel: eventData.channel,
            renderedMessage: renderedMessage,
            correlationId: eventData.correlationId || 'unknown',
            configCode: eventData.configCode,
          },
          jobOptions,
        );

        // Mark the existing message as queued
        messageAggregate.markAsQueued(
          tenantUser,
          job.id?.toString() || '',
          jobOptions.priority,
        );

        // Save the updated aggregate
        await this.messageRepository.saveMessage(tenantUser, messageAggregate);

        this.logger.log(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'EXISTING_MESSAGE_QUEUED',
            messageId: meta.aggregateId,
            jobId: job.id?.toString(),
            channel: eventData.channel,
            tenant,
          },
          'DEBUG: Successfully queued existing message',
        );
      } catch (queueError) {
        this.logger.error(
          {
            component: 'SendSlackMessageEventHandler',
            debugPoint: 'QUEUE_ERROR',
            messageId: meta.aggregateId,
            error:
              queueError instanceof Error
                ? queueError.message
                : 'Unknown error',
          },
          'ERROR: Failed to queue existing message',
        );
        throw queueError;
      }

      // Mark event as processed to prevent future duplicates
      if (meta.revision !== undefined) {
        const eventTypeStream = '$et-slack.message.created.v1';
        this.logger.debug(
          {
            revision: meta.revision.toString(),
            revisionType: typeof meta.revision,
            eventTypeStream,
            aboutToUpdateToProcessed: true,
          },
          'About to update event status from processing to processed',
        );
        // Update the status from 'processing' to 'processed'
        await this.processedEventRepository.updateSlackEventStatus(
          eventTypeStream,
          meta.revision,
          'processed',
        );
        this.logger.debug(
          {
            revision: meta.revision.toString(),
            eventTypeStream,
            updatedToProcessed: true,
          },
          'Successfully updated event status to processed',
        );
      } else {
        this.logger.warn(
          {
            revision: meta.revision,
            revisionUndefined: meta.revision === undefined,
            revisionNull: meta.revision === null,
          },
          'Revision is undefined - cannot mark event as processed',
        );
      }

      this.logger.log(
        {
          tenant,
          messageId: meta.aggregateId,
          correlationId: eventData.correlationId,
          eventType: meta.eventType,
          streamName: meta.stream,
        },
        'Successfully executed Slack delivery from MessageCreatedEvent',
      );
    } catch (error) {
      // Mark event as failed if we marked it as processing
      if (meta.revision !== undefined) {
        try {
          const eventTypeStream = '$et-slack.message.created.v1';
          await this.processedEventRepository.updateSlackEventStatus(
            eventTypeStream,
            meta.revision,
            'failed',
          );
          this.logger.debug(
            {
              revision: meta.revision.toString(),
              eventTypeStream,
              updatedToFailed: true,
            },
            'Successfully updated event status to failed after error',
          );
        } catch (updateError) {
          this.logger.error(
            {
              revision: meta.revision.toString(),
              error:
                updateError instanceof Error
                  ? updateError.message
                  : 'Unknown error',
            },
            'Failed to update event status to failed',
          );
        }
      }

      this.logger.error(
        {
          eventData,
          meta,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to handle MessageCreatedEvent - Slack delivery failed',
      );
      throw error;
    }
  }

  /**
   * Check if event type is slack.message.created.v1
   */
  private isMessageCreatedEvent(eventType: string): boolean {
    // Use the event type from the actual event class to avoid hardcoding
    const expectedEventType = MessageCreatedEvent.EVENT_TYPE;

    return eventType.toLowerCase().includes(expectedEventType.toLowerCase());
  }

  /**
   * Handle scheduled message by using QueueSlackMessageCommand
   */
  private async handleScheduledMessage(
    user: IUserToken,
    eventData: CreateMessageProps,
    meta: EventStoreMetaProps,
    scheduledDate: Date,
  ): Promise<void> {
    const now = new Date();
    const delay = scheduledDate.getTime() - now.getTime();

    this.logger.debug(
      {
        messageId: meta.aggregateId,
        correlationId: eventData.correlationId,
        scheduledAt: scheduledDate.toISOString(),
        delay,
        tenant: user.tenant,
      },
      'Scheduling Slack message for future delivery via QueueSlackMessageCommand',
    );

    try {
      // Render the message template to get the final Slack message
      let renderedMessage = 'Message content'; // Default fallback

      if (eventData.templateCode) {
        try {
          const renderCommand = new RenderMessageTemplateCommand({
            templateCode: eventData.templateCode,
            payload: eventData.payload,
            channel: eventData.channel,
            tenant: user.tenant || 'unknown',
            configCode: eventData.configCode,
            correlationId: eventData.correlationId || 'unknown',
          });
          renderedMessage = await this.commandBus.execute(renderCommand);
        } catch (error) {
          this.logger.warn(
            {
              templateCode: eventData.templateCode,
              tenant: user.tenant,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Failed to render message template for scheduled message - using fallback',
          );
        }
      } else if (eventData.renderedMessage) {
        renderedMessage = eventData.renderedMessage;
      }

      // Queue the message using QueueSlackMessageCommand
      const queueCommand = new QueueSlackMessageCommand(user, {
        tenant: user.tenant || 'unknown',
        configCode: eventData.configCode,
        channel: eventData.channel,
        templateCode: eventData.templateCode,
        payload: eventData.payload,
        renderedMessage: renderedMessage,
        scheduledAt: scheduledDate,
        correlationId: eventData.correlationId || 'unknown',
        priority: 1, // Normal priority
      });

      await this.commandBus.execute(queueCommand);

      // Update the message status to SCHEDULED to emit MessageScheduledEvent
      try {
        const messageAggregate: Message | undefined =
          await this.messageRepository.getById(user, meta.aggregateId);
        if (messageAggregate) {
          messageAggregate.updateStatus(user, MessageStatusEnum.SCHEDULED);
          await this.messageRepository.saveMessage(user, messageAggregate);
        }
      } catch (statusUpdateError) {
        this.logger.warn(
          {
            messageId: meta.aggregateId,
            error:
              statusUpdateError instanceof Error
                ? statusUpdateError.message
                : 'Unknown error',
          },
          'Failed to update message status to SCHEDULED - event not emitted but message scheduling succeeded',
        );
      }

      this.logger.log(
        {
          messageId: meta.aggregateId,
          correlationId: eventData.correlationId,
          scheduledAt: scheduledDate.toISOString(),
          delay,
          tenant: user.tenant,
        },
        `Successfully scheduled Slack message for delivery at ${scheduledDate.toISOString()} (${delay}ms delay)`,
      );
    } catch (error) {
      this.logger.error(
        {
          messageId: meta.aggregateId,
          correlationId: eventData.correlationId,
          scheduledAt: scheduledDate.toISOString(),
          delay,
          tenant: user.tenant,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to schedule Slack message via QueueSlackMessageCommand - will fall back to immediate processing',
      );

      // If scheduling fails, fall back to immediate processing
      this.logger.warn(
        {
          messageId: meta.aggregateId,
          correlationId: eventData.correlationId,
        },
        'Falling back to immediate processing due to scheduling failure',
      );

      // Process immediately as fallback using SendSlackMessageCommand
      try {
        let renderedMessage = 'Message content'; // Default fallback

        if (eventData.templateCode) {
          try {
            const renderCommand = new RenderMessageTemplateCommand({
              templateCode: eventData.templateCode,
              payload: eventData.payload,
              channel: eventData.channel,
              tenant: user.tenant || 'unknown',
              configCode: eventData.configCode,
              correlationId: eventData.correlationId || 'unknown',
            });
            renderedMessage = await this.commandBus.execute(renderCommand);
          } catch (renderError) {
            this.logger.warn(
              {
                templateCode: eventData.templateCode,
                error:
                  renderError instanceof Error
                    ? renderError.message
                    : 'Unknown error',
              },
              'Failed to render template in fallback - using default message',
            );
          }
        } else if (eventData.renderedMessage) {
          renderedMessage = eventData.renderedMessage;
        }

        const queueCommand = new QueueSlackMessageCommand(user, {
          tenant: user.tenant || 'unknown',
          configCode: eventData.configCode,
          channel: eventData.channel,
          templateCode: eventData.templateCode,
          payload: eventData.payload,
          renderedMessage: renderedMessage,
          scheduledAt: eventData.scheduledAt,
          correlationId: eventData.correlationId || 'unknown',
          priority: 1,
        });

        await this.commandBus.execute(queueCommand);
      } catch (fallbackError) {
        this.logger.error(
          {
            messageId: meta.aggregateId,
            correlationId: eventData.correlationId,
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : 'Unknown error',
          },
          'Fallback immediate processing also failed - message delivery failed',
        );
      }
    }
  }

  /**
   * Extract tenant from stream name
   * Expected format: some.stream.name-tenant123-other
   */
  private extractTenantFromStream(streamName: string): string | null {
    try {
      // Simple pattern extraction for tenant
      // This should be adapted based on your actual stream naming convention
      const parts = streamName.split('-');
      if (parts.length >= 2) {
        return parts[1]; // Assuming tenant is second part after first dash
      }

      this.logger.warn(
        { streamName },
        'Unable to extract tenant from stream name',
      );
      return null;
    } catch (error) {
      this.logger.error(
        { streamName, error },
        'Failed to extract tenant from stream name',
      );
      return null;
    }
  }

  /**
   * Mark event handler as initialized
   */
  markAsInitialized(): void {
    this.isInitialized = true;
    this.logger.log(
      { component: 'SendSlackMessageEventHandler', initialized: true },
      'Event handler marked as initialized and ready to process events',
    );
  }

  /**
   * Check if event handler is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Health check for the event handler
   */
  isHealthy(): boolean {
    try {
      // Simple health check - ensure the handler is initialized
      return this.isInitialized;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Event handler health check failed',
      );
      return false;
    }
  }
}
