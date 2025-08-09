/**
 * SIMPLIFIED EVENT HANDLER - No Deduplication Overkill
 * EventStore subscriptions already provide exactly-once delivery guarantees
 */

import { Inject, Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { MessageQueueService } from '../../application/services';
import { MessageQueueApplicationCreatedEvent } from '../../domain/events';
import { UpdateMessageQueueProps } from '../../domain/properties';
@Injectable()
export class MessageQueueEventHandler {
  private readonly systemUser: IUserToken;

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly messageService: MessageQueueService,
  ) {
    this.systemUser = {
      sub: 'message-queue-event-handler',
      preferred_username: 'system',
      name: 'System MessageQueue Queue Event Handler',
      email: 'system@internal',
      tenant: 'system',
      roles: ['system'],
    } as IUserToken;
  }

  /**
   * Simple event handler - EventStore handles deduplication for us
   */
  async handleMessageQueueEvent(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    this.logger.log(
      {
        component: 'MessageQueueEventHandler',
        eventType: meta.eventType,
        stream: meta.stream,
        messageId: meta.aggregateId,
      },
      'Processing EventStore event - no deduplication needed',
    );

    try {
      // Simple validation - no complex deduplication needed
      if (!this.isMessageQueueCreatedEvent(meta.eventType)) {
        this.logger.debug(
          { eventType: meta.eventType },
          'Skipping non-MessageQueueCreatedEvent',
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
      const tenantUser: IUserToken = {
        sub: meta.userId || 'unknown',
        name: meta.username || 'Unknown User',
        email: meta.username || 'unknown@internal',
        preferred_username: meta.username || 'unknown',
        tenant: meta.tenant || 'yyyy',
        tenant_id: meta.tenantId || '',
        client_id: meta.userId,
      };

      console.log(tenantUser);
      // Process the message (business logic)
      await this.processMessageQueue(tenantUser, eventData);

      this.logger.log(
        {
          messageId: meta.aggregateId,
          tenant,
        },
        'Successfully processed MessageQueueCreatedEvent',
      );
    } catch (error) {
      this.logger.error(
        {
          messageId: meta.aggregateId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to process MessageQueueCreatedEvent',
      );
      throw error;
    }
  }

  /**
   * Simple processing - directly use existing working command
   */
  private async processMessageQueue(
    user: IUserToken,
    eventData: UpdateMessageQueueProps,
  ): Promise<void> {
    // Use the existing working QueueMessageQueueCommand
    // This was working fine before - no need to complicate it
    // const queueCommand = this.messageService(user, {
    //   tenant: user.tenant!,
    //   configCode: eventData.configCode,
    //   channel: eventData.channel,
    //   templateCode: eventData.templateCode,
    //   payload: eventData.payload,
    //   renderedMessageQueue: eventData.renderedMessageQueue || 'Default message content',
    //   scheduledAt: eventData.scheduledAt,
    //   correlationId: eventData.correlationId || 'unknown',
    //   priority: 1,
    // });

    // await this.commandBus.execute(queueCommand);

    await this.messageService.queueMessageQueue(user, eventData);
  }

  private isMessageQueueCreatedEvent(eventType: string): boolean {
    return eventType
      .toLowerCase()
      .includes(MessageQueueApplicationCreatedEvent.EVENT_TYPE.toLowerCase());
  }

  private extractTenantFromStream(streamName: string): string | null {
    const parts = streamName.split('-');
    return parts.length >= 2 ? parts[1] : null;
  }
}
