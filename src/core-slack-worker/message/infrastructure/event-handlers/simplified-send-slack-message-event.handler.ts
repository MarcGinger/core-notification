/**
 * SIMPLIFIED EVENT HANDLER - No Deduplication Overkill
 * EventStore subscriptions already provide exactly-once delivery guarantees
 */

import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { CreateMessageProps } from '../../domain/properties';
import { MessageCreatedEvent } from '../../domain/events';
import { QueueSlackMessageCommand, RenderMessageTemplateCommand } from '../../application/commands';

@Injectable()
export class SimplifiedSendSlackMessageEventHandler {
  private readonly systemUser: IUserToken;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
  ) {
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
   * Simple event handler - EventStore handles deduplication for us
   */
  async handleMessageEvent(
    eventData: CreateMessageProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    this.logger.log(
      {
        component: 'SimplifiedSendSlackMessageEventHandler',
        eventType: meta.eventType,
        stream: meta.stream,
        messageId: meta.aggregateId,
      },
      'Processing EventStore event - no deduplication needed',
    );

    try {
      // Simple validation - no complex deduplication needed
      if (!this.isMessageCreatedEvent(meta.eventType)) {
        this.logger.debug(
          { eventType: meta.eventType },
          'Skipping non-MessageCreatedEvent',
        );
        return;
      }

      // Extract tenant
      const tenant = meta.tenant || this.extractTenantFromStream(meta.stream);
      if (!tenant) {
        this.logger.warn({ meta }, 'No tenant found - skipping event');
        return;
      }

      // Create tenant user
      const tenantUser: IUserToken = { ...this.systemUser, tenant };

      // Process the message (business logic)
      await this.processMessage(tenantUser, eventData, meta);

      this.logger.log(
        {
          messageId: meta.aggregateId,
          tenant,
        },
        'Successfully processed MessageCreatedEvent',
      );
    } catch (error) {
      this.logger.error(
        {
          messageId: meta.aggregateId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to process MessageCreatedEvent',
      );
      throw error;
    }
  }

  /**
   * Business logic for processing the message
   */
  private async processMessage(
    user: IUserToken,
    eventData: CreateMessageProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    // Render message content
    let renderedMessage = 'Default message content';
    
    if (eventData.templateCode) {
      try {
        const renderCommand = new RenderMessageTemplateCommand({
          templateCode: eventData.templateCode,
          payload: eventData.payload,
          channel: eventData.channel,
          tenant: user.tenant,
          configCode: eventData.configCode,
          correlationId: eventData.correlationId || 'unknown',
        });
        renderedMessage = await this.commandBus.execute(renderCommand);
      } catch (error) {
        this.logger.warn(
          { templateCode: eventData.templateCode, error },
          'Template rendering failed - using fallback',
        );
        renderedMessage = eventData.renderedMessage || 'Default message content';
      }
    } else if (eventData.renderedMessage) {
      renderedMessage = eventData.renderedMessage;
    }

    // Queue the message
    const queueCommand = new QueueSlackMessageCommand(user, {
      tenant: user.tenant,
      configCode: eventData.configCode,
      channel: eventData.channel,
      templateCode: eventData.templateCode,
      payload: eventData.payload,
      renderedMessage,
      scheduledAt: eventData.scheduledAt,
      correlationId: eventData.correlationId || 'unknown',
      priority: 1,
    });

    await this.commandBus.execute(queueCommand);
  }

  private isMessageCreatedEvent(eventType: string): boolean {
    return eventType.toLowerCase().includes(MessageCreatedEvent.EVENT_TYPE.toLowerCase());
  }

  private extractTenantFromStream(streamName: string): string | null {
    const parts = streamName.split('-');
    return parts.length >= 2 ? parts[1] : null;
  }
}
