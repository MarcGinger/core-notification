/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 */

import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { MessageStatusEnum } from '../../domain/entities';
import { CreateMessageProps } from '../../domain/properties';
import { MessageRepository } from '../../infrastructure/repositories';
import {
  RenderMessageTemplateCommand,
  ScheduleExistingMessageCommand,
} from '../commands';
import { Message } from '../../domain/aggregates';

export interface MessageCreatedEventHandlerProps {
  eventData: CreateMessageProps;
  aggregateId: string;
  tenant: string;
  revision?: bigint;
  correlationId?: string;
}

/**
 * Application layer handler for MessageCreatedEvent business logic.
 * This contains the core business rules and orchestrates use cases.
 *
 * Responsibilities:
 * - Business logic for message processing decisions
 * - Template rendering coordination
 * - Scheduling logic
 * - Message state management
 */
@Injectable()
export class MessageCreatedEventHandler {
  constructor(
    private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
    private readonly messageRepository: MessageRepository,
  ) {}

  /**
   * Handle the business logic for a MessageCreatedEvent
   */
  async handle(
    user: IUserToken,
    props: MessageCreatedEventHandlerProps,
  ): Promise<{ success: boolean; scheduled?: boolean }> {
    const { eventData, aggregateId, tenant, correlationId } = props;

    this.logger.log(
      {
        component: 'MessageCreatedEventHandler',
        method: 'handle',
        messageId: aggregateId,
        tenant,
        correlationId,
        hasTemplateCode: !!eventData.templateCode,
        isScheduled: !!eventData.scheduledAt,
      },
      'Processing MessageCreatedEvent business logic',
    );

    try {
      // Business Logic: Check if this is a scheduled message
      if (eventData.scheduledAt) {
        return await this.handleScheduledMessage(user, props);
      }

      // Business Logic: Handle immediate message processing
      return await this.handleImmediateMessage(user, props);
    } catch (error) {
      this.logger.error(
        {
          messageId: aggregateId,
          tenant,
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to process MessageCreatedEvent business logic',
      );

      return { success: false };
    }
  }

  /**
   * Business Logic: Handle scheduled message processing
   */
  private async handleScheduledMessage(
    user: IUserToken,
    props: MessageCreatedEventHandlerProps,
  ): Promise<{ success: boolean; scheduled: boolean }> {
    const { eventData, aggregateId, tenant, correlationId } = props;

    const scheduledDate = new Date(eventData.scheduledAt!);
    const now = new Date();

    // Business Rule: Only schedule if future date
    if (scheduledDate <= now) {
      this.logger.log(
        {
          messageId: aggregateId,
          scheduledAt: scheduledDate.toISOString(),
          currentTime: now.toISOString(),
        },
        'Scheduled time is in the past - processing immediately',
      );

      return await this.handleImmediateMessage(user, props);
    }

    // Business Logic: Render message for scheduling
    const renderedMessage = await this.renderMessage(
      user,
      eventData,
      tenant,
      aggregateId,
    );

    // Business Logic: Schedule the message
    try {
      const scheduleCommand = new ScheduleExistingMessageCommand(user, {
        messageId: aggregateId, // Use existing message ID
        tenant,
        configCode: eventData.configCode,
        channel: eventData.channel,
        renderedMessage,
        scheduledAt: scheduledDate,
        correlationId: correlationId || 'unknown',
        priority: 1,
      });

      await this.commandBus.execute(scheduleCommand);

      // Business Logic: Update message status to reflect scheduling
      await this.updateMessageStatus(
        user,
        aggregateId,
        MessageStatusEnum.SCHEDULED,
      );

      return { success: true, scheduled: true };
    } catch (error) {
      this.logger.warn(
        {
          messageId: aggregateId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to schedule message - falling back to immediate processing',
      );

      // Business Rule: Fallback to immediate processing
      return await this.handleImmediateMessage(user, props);
    }
  }

  /**
   * Business Logic: Handle immediate message processing
   */
  private async handleImmediateMessage(
    user: IUserToken,
    props: MessageCreatedEventHandlerProps,
  ): Promise<{ success: boolean; scheduled: boolean }> {
    const { eventData, aggregateId, tenant, correlationId } = props;

    // Business Logic: Render the message
    const renderedMessage = await this.renderMessage(
      user,
      eventData,
      tenant,
      aggregateId,
    );

    // Business Logic: Queue for immediate processing
    const scheduleCommand = new ScheduleExistingMessageCommand(user, {
      messageId: aggregateId, // Use existing message ID
      tenant,
      configCode: eventData.configCode,
      channel: eventData.channel,
      renderedMessage,
      scheduledAt: eventData.scheduledAt,
      correlationId: correlationId || 'unknown',
      priority: 1,
    });

    await this.commandBus.execute(scheduleCommand);

    this.logger.log(
      {
        messageId: aggregateId,
        tenant,
        correlationId,
      },
      'Successfully queued message for immediate processing',
    );

    return { success: true, scheduled: false };
  }

  /**
   * Business Logic: Render message content
   */
  private async renderMessage(
    user: IUserToken,
    eventData: CreateMessageProps,
    tenant: string,
    messageId: string,
  ): Promise<string> {
    // Business Rule: Use template if available, otherwise use pre-rendered or fallback
    if (eventData.templateCode) {
      try {
        const renderCommand = new RenderMessageTemplateCommand({
          templateCode: eventData.templateCode,
          payload: eventData.payload,
          channel: eventData.channel,
          tenant,
          configCode: eventData.configCode,
          correlationId: eventData.correlationId || 'unknown',
        });

        const rendered = await this.commandBus.execute<
          RenderMessageTemplateCommand,
          string
        >(renderCommand);

        return rendered;
      } catch (error) {
        this.logger.warn(
          {
            templateCode: eventData.templateCode,
            messageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to render message template - using fallback',
        );

        // Business Rule: Fallback to pre-rendered or default
        return eventData.renderedMessage || 'Default message content';
      }
    }

    // Business Rule: Use pre-rendered message if available
    if (eventData.renderedMessage) {
      return eventData.renderedMessage;
    }

    // Business Rule: Final fallback
    return 'Default message content';
  }

  /**
   * Business Logic: Update message status
   */
  private async updateMessageStatus(
    user: IUserToken,
    messageId: string,
    status: MessageStatusEnum,
  ): Promise<void> {
    try {
      const messageAggregate: Message | undefined =
        await this.messageRepository.getById(user, messageId);

      if (messageAggregate) {
        messageAggregate.updateStatus(user, status);
        await this.messageRepository.saveMessage(user, messageAggregate);
      }
    } catch (error) {
      this.logger.warn(
        {
          messageId,
          status,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to update message status - continuing without status update',
      );
    }
  }
}
