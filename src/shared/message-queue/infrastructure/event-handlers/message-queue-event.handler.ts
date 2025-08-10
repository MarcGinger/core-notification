/**
 * GENERIC MESSAGE QUEUE EVENT HANDLER
 * Routes events to appropriate queues based on dynamically registered strategies
 * EventStore subscriptions already provide exactly-once delivery guarantees
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IUserToken } from 'src/shared/auth';
import { QUEUE_NAMES } from 'src/shared/infrastructure/bullmq';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { UpdateMessageQueueProps } from '../../domain/properties';

/**
 * Generic strategy interface for routing messages to different queues
 */
export interface IMessageRoutingStrategy<
  TEventData = UpdateMessageQueueProps,
  TJobOptions = any,
  TTransformedData = any,
> {
  canHandle(eventData: TEventData, meta: EventStoreMetaProps): boolean;
  getQueueName(): string;
  getJobType(): string;
  getJobOptions(eventData: TEventData): TJobOptions;
  transformData(eventData: TEventData, user: IUserToken): TTransformedData;
}

/**
 * Standard job options structure
 */
export interface StandardJobOptions {
  priority: number;
  delay: number;
  attempts: number;
  removeOnComplete: number;
  removeOnFail: number;
  backoff?: {
    type: string;
    delay: number;
  };
}

/**
 * Generic Message Queue Event Handler
 * Routes events to appropriate queues using dynamically registered strategies
 */
@Injectable()
export class MessageQueueEventHandler {
  private readonly routingStrategies: IMessageRoutingStrategy[];

  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE)
    private readonly slackQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private readonly dataProcessingQueue: Queue,
    @Optional()
    @Inject('CUSTOM_MESSAGE_ROUTING_STRATEGIES')
    private readonly customStrategies?: IMessageRoutingStrategy[],
  ) {
    // Initialize routing strategies: custom strategies first, then fallback
    this.routingStrategies = this.customStrategies || [];

    this.logger.log(
      {
        component: 'MessageQueueEventHandler',
        strategiesCount: this.routingStrategies.length,
        customStrategiesCount: this.customStrategies?.length || 0,
      },
      'Message queue event handler initialized with strategies',
    );
  }

  /**
   * Generic event handler that routes to appropriate queues
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
      'Processing EventStore event for generic routing',
    );

    try {
      // Extract tenant and create user context
      const tenant = meta.tenant || this.extractTenantFromStream(meta.stream);
      if (!tenant) {
        this.logger.warn({ meta }, 'No tenant found - skipping event');
        return;
      }

      const tenantUser: IUserToken = {
        sub: meta.userId || 'unknown',
        name: meta.username || 'Unknown User',
        email: meta.username || 'unknown@internal',
        preferred_username: meta.username || 'unknown',
        tenant: meta.tenant || tenant,
        tenant_id: meta.tenantId || '',
        client_id: meta.userId,
      };

      // Route to appropriate queue using strategy pattern
      await this.routeToQueue(tenantUser, eventData, meta);

      this.logger.log(
        {
          messageId: meta.aggregateId,
          tenant,
        },
        'Successfully processed and routed message queue event',
      );
    } catch (error) {
      this.logger.error(
        {
          messageId: meta.aggregateId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to process MessageQueue event',
      );
      throw error;
    }
  }

  /**
   * Route message to appropriate queue using strategy pattern
   */
  private async routeToQueue(
    user: IUserToken,
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): Promise<void> {
    // Find the first strategy that can handle this message
    const strategy = this.routingStrategies.find((s) =>
      s.canHandle(eventData, meta),
    );

    if (!strategy) {
      this.logger.warn(
        { eventData, meta },
        'No routing strategy found for message - this should not happen as DataProcessingStrategy is fallback',
      );
      return;
    }

    const queueName = strategy.getQueueName();
    const jobType = strategy.getJobType();
    const jobOptions = strategy.getJobOptions(eventData) as StandardJobOptions;
    const jobData = strategy.transformData(eventData, user) as Record<
      string,
      any
    >;

    // Get the appropriate queue
    const queue = this.getQueueByName(queueName);

    if (!queue) {
      this.logger.error({ queueName }, 'Queue not found for routing strategy');
      return;
    }

    // Add job to queue
    const job = await queue.add(jobType, jobData, jobOptions as any);

    this.logger.log(
      {
        messageId: eventData.id,
        queueName,
        jobType,
        jobId: job.id,
        priority: jobOptions.priority,
        delay: jobOptions.delay,
      },
      'Successfully routed message to queue',
    );
  }

  /**
   * Get queue instance by name
   */
  private getQueueByName(queueName: string): Queue | null {
    switch (queueName) {
      case QUEUE_NAMES.SLACK_MESSAGE:
        return this.slackQueue;
      case QUEUE_NAMES.EMAIL:
        return this.emailQueue;
      case QUEUE_NAMES.NOTIFICATION:
        return this.notificationQueue;
      case QUEUE_NAMES.DATA_PROCESSING:
        return this.dataProcessingQueue;
      default:
        return null;
    }
  }

  /**
   * Extract tenant from stream name
   */
  private extractTenantFromStream(streamName: string): string | null {
    const parts = streamName.split('-');
    return parts.length >= 2 ? parts[1] : null;
  }
}
