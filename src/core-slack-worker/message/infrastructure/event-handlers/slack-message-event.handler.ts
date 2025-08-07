/**
 * SIMPLIFIED EVENT HANDLER - No Deduplication Overkill
 * EventStore subscriptions already provide exactly-once delivery guarantees
 */

import { Inject, Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { MessageCreatedEvent } from '../../domain/events';
import { MessageService } from '../../application/services';
import { IMessage } from '../../domain';
@Injectable()
export class SlackMessageEventHandler {
  private readonly systemUser: IUserToken;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly messageService: MessageService,
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
    eventData: IMessage,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    this.logger.log(
      {
        component: 'SlackMessageEventHandler',
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
      await this.processMessage(tenantUser, eventData);

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
   * Simple processing - directly use existing working command
   */
  private async processMessage(
    user: IUserToken,
    eventData: IMessage,
  ): Promise<void> {
    // Use the existing working QueueSlackMessageCommand
    // This was working fine before - no need to complicate it
    // const queueCommand = this.messageService(user, {
    //   tenant: user.tenant!,
    //   configCode: eventData.configCode,
    //   channel: eventData.channel,
    //   templateCode: eventData.templateCode,
    //   payload: eventData.payload,
    //   renderedMessage: eventData.renderedMessage || 'Default message content',
    //   scheduledAt: eventData.scheduledAt,
    //   correlationId: eventData.correlationId || 'unknown',
    //   priority: 1,
    // });

    // await this.commandBus.execute(queueCommand);

    await this.messageService.queueMessage(user, eventData);
  }

  private isMessageCreatedEvent(eventType: string): boolean {
    return eventType
      .toLowerCase()
      .includes(MessageCreatedEvent.EVENT_TYPE.toLowerCase());
  }

  private extractTenantFromStream(streamName: string): string | null {
    const parts = streamName.split('-');
    return parts.length >= 2 ? parts[1] : null;
  }
}
