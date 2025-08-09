/**
 * GENERIC MESSAGE QUEUE EVENT HANDLER
 * Routes events to appropriate queues based on message type and content
 * EventStore subscriptions already provide exactly-once delivery guarantees
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IUserToken } from 'src/shared/auth';
import {
  JOB_OPTIONS_TEMPLATES,
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
} from 'src/shared/infrastructure/bullmq';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { ILogger } from 'src/shared/logger';
import { MessageQueueApplicationCreatedEvent } from '../../domain/events';
import { UpdateMessageQueueProps } from '../../domain/properties';

/**
 * Strategy interface for routing messages to different queues
 */
export interface IMessageRoutingStrategy<
  TEventData,
  TJobOptions,
  TTransformedData,
> {
  canHandle(eventData: TEventData, meta: EventStoreMetaProps): boolean;
  getQueueName(): string;
  getJobType(): string;
  getJobOptions(eventData: TEventData): TJobOptions;
  transformData(eventData: TEventData, user: IUserToken): TTransformedData;
}

/**
 * Slack job data structure
 */
export interface SlackJobData {
  messageId: string;
  tenant: string;
  channel: string;
  templateCode?: string;
  payload?: Record<string, any>;
  renderedMessage: string;
  scheduledAt?: Date;
  correlationId: string;
  priority: number;
  userId: string;
}

/**
 * Email job data structure
 */
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
  tenant: string;
  correlationId?: string;
  userId: string;
}

/**
 * Notification job data structure
 */
export interface NotificationJobData {
  userId: string;
  type: string;
  message: string;
  metadata: Record<string, any>;
}

/**
 * Data processing job data structure
 */
export interface DataProcessingJobData {
  dataType: string;
  dataId: string;
  operation: string;
  parameters: Record<string, any>;
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
 * Slack message routing strategy
 */
@Injectable()
export class SlackMessageStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      SlackJobData
    >
{
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload = eventData.payload as any;
    return Boolean(
      meta.stream?.includes('slack') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        payload?.channel?.startsWith('#') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        payload?.channel?.startsWith('@') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.messageType === 'slack',
    );
  }

  getQueueName(): string {
    return QUEUE_NAMES.SLACK_MESSAGE;
  }

  getJobType(): string {
    return 'send-slack-message';
  }

  getJobOptions(eventData: UpdateMessageQueueProps): StandardJobOptions {
    return {
      ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
      priority: eventData.priority || QUEUE_PRIORITIES.NORMAL,
      delay: eventData.scheduledAt
        ? new Date(eventData.scheduledAt).getTime() - Date.now()
        : 0,
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): SlackJobData {
    return {
      messageId: eventData.id,
      tenant: user.tenant || 'unknown',
      channel: eventData.payload?.channel as string,
      templateCode: eventData.payload?.templateCode as string,
      payload: eventData.payload,
      renderedMessage:
        (eventData.payload?.renderedMessage as string) ||
        'Default message content',
      scheduledAt: eventData.scheduledAt,
      correlationId: eventData.correlationId || 'unknown',
      priority: eventData.priority || 1,
      userId: user.sub,
    };
  }
}

/**
 * Email message routing strategy
 */
@Injectable()
export class EmailMessageStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      EmailJobData
    >
{
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload = eventData.payload as any;
    return Boolean(
      meta.stream?.includes('email') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.email ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.to ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.messageType === 'email',
    );
  }

  getQueueName(): string {
    return QUEUE_NAMES.EMAIL;
  }

  getJobType(): string {
    return 'send-email';
  }

  getJobOptions(eventData: UpdateMessageQueueProps): StandardJobOptions {
    return {
      ...JOB_OPTIONS_TEMPLATES.SCHEDULED,
      priority: eventData.priority || QUEUE_PRIORITIES.NORMAL,
      delay: eventData.scheduledAt
        ? new Date(eventData.scheduledAt).getTime() - Date.now()
        : 0,
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): EmailJobData {
    return {
      to: (eventData.payload?.to || eventData.payload?.email) as string,
      subject: (eventData.payload?.subject as string) || 'Notification',
      body: (eventData.payload?.renderedMessage ||
        eventData.payload?.body) as string,
      template: eventData.payload?.templateCode as string,
      tenant: user.tenant || 'unknown',
      correlationId: eventData.correlationId,
      userId: user.sub,
    };
  }
}

/**
 * Notification routing strategy
 */
@Injectable()
export class NotificationStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      NotificationJobData
    >
{
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload = eventData.payload as any;
    return Boolean(
      meta.stream?.includes('notification') ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.messageType === 'notification' ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload?.notificationType,
    );
  }

  getQueueName(): string {
    return QUEUE_NAMES.NOTIFICATION;
  }

  getJobType(): string {
    return 'send-notification';
  }

  getJobOptions(eventData: UpdateMessageQueueProps): StandardJobOptions {
    return {
      ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
      priority: eventData.priority || QUEUE_PRIORITIES.HIGH,
      delay: 0,
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): NotificationJobData {
    return {
      userId: (eventData.payload?.userId as string) || user.sub,
      type: (eventData.payload?.notificationType as string) || 'general',
      message: (eventData.payload?.renderedMessage ||
        eventData.payload?.message) as string,
      metadata: {
        ...eventData.payload,
        tenant: user.tenant,
        correlationId: eventData.correlationId,
      },
    };
  }
}

/**
 * Transaction notification job data structure
 */
export interface TransactionNotificationJobData {
  transactionId: string;
  action: 'created' | 'completed' | 'failed' | 'queued' | 'retrying';
  transaction: {
    from: string;
    to: string;
    amount: number;
    status: string;
  };
  tenant: string;
  userId: string;
  correlationId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Transaction notification routing strategy
 * Routes transaction events to appropriate notification channels
 */
@Injectable()
export class TransactionNotificationStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      TransactionNotificationJobData
    >
{
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    // Handle all transaction-related events
    return Boolean(
      meta.eventType?.includes('transaction.') ||
        meta.stream?.includes('transaction') ||
        eventData.payload?.transactionId ||
        eventData.payload?.from || // transaction has from/to fields
        (eventData.payload?.amount && eventData.payload?.to),
    );
  }

  getQueueName(): string {
    return QUEUE_NAMES.NOTIFICATION; // Use notification queue for transaction events
  }

  getJobType(): string {
    return 'send-transaction-notification';
  }

  getJobOptions(_eventData: UpdateMessageQueueProps): StandardJobOptions {
    // Transaction notifications are high priority
    return {
      ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
      priority: QUEUE_PRIORITIES.HIGH,
      delay: 0,
      attempts: 3, // Retry failed notifications
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): TransactionNotificationJobData {
    // Extract action from event type
    const action = this.extractActionFromEventType(
      eventData.payload?.eventType as string,
    );

    return {
      transactionId: eventData.id,
      action,
      transaction: {
        from: (eventData.payload?.from as string) || 'unknown',
        to: (eventData.payload?.to as string) || 'unknown',
        amount: (eventData.payload?.amount as number) || 0,
        status: (eventData.payload?.status as string) || 'unknown',
      },
      tenant: user.tenant || 'unknown',
      userId: user.sub,
      correlationId: eventData.correlationId,
      timestamp: new Date(),
      metadata: {
        ...eventData.payload,
        originalEventType: eventData.payload?.eventType as string,
        streamName: eventData.payload?.streamName as string,
      },
    };
  }

  private extractActionFromEventType(
    eventType: string,
  ): 'created' | 'completed' | 'failed' | 'queued' | 'retrying' {
    if (eventType?.includes('created')) return 'created';
    if (eventType?.includes('completed')) return 'completed';
    if (eventType?.includes('failed')) return 'failed';
    if (eventType?.includes('queued')) return 'queued';
    if (eventType?.includes('retrying')) return 'retrying';
    return 'created'; // default fallback
  }
}

/**
 * Data processing routing strategy (default fallback)
 */
@Injectable()
export class DataProcessingStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      DataProcessingJobData
    >
{
  canHandle(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _eventData: UpdateMessageQueueProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _meta: EventStoreMetaProps,
  ): boolean {
    // This is the fallback strategy - always returns true if others don't match
    return true;
  }

  getQueueName(): string {
    return QUEUE_NAMES.DATA_PROCESSING;
  }

  getJobType(): string {
    return 'process-data';
  }

  getJobOptions(eventData: UpdateMessageQueueProps): StandardJobOptions {
    return {
      ...JOB_OPTIONS_TEMPLATES.SCHEDULED,
      priority: eventData.priority || QUEUE_PRIORITIES.LOW,
      delay: 0,
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): DataProcessingJobData {
    return {
      dataType: 'message-queue-event',
      dataId: eventData.id,
      operation: 'process-generic-message',
      parameters: {
        ...eventData.payload,
        tenant: user.tenant,
        correlationId: eventData.correlationId,
        userId: user.sub,
      },
    };
  }
}
/**
 * Generic Message Queue Event Handler
 * Routes events to appropriate queues using strategy pattern
 */
@Injectable()
export class MessageQueueEventHandler {
  private readonly systemUser: IUserToken;
  private readonly routingStrategies: Array<
    | SlackMessageStrategy
    | EmailMessageStrategy
    | NotificationStrategy
    | TransactionNotificationStrategy
    | DataProcessingStrategy
  >;

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
    private readonly slackStrategy: SlackMessageStrategy,
    private readonly emailStrategy: EmailMessageStrategy,
    private readonly notificationStrategy: NotificationStrategy,
    private readonly transactionNotificationStrategy: TransactionNotificationStrategy,
    private readonly dataProcessingStrategy: DataProcessingStrategy,
  ) {
    this.systemUser = {
      sub: 'message-queue-event-handler',
      preferred_username: 'system',
      name: 'System MessageQueue Event Handler',
      email: 'system@internal',
      tenant: 'system',
      roles: ['system'],
    } as IUserToken;

    // Initialize routing strategies in priority order
    // TransactionNotificationStrategy has high priority for transaction events
    // DataProcessingStrategy is last as it's the fallback
    this.routingStrategies = [
      this.transactionNotificationStrategy,
      this.slackStrategy,
      this.emailStrategy,
      this.notificationStrategy,
      this.dataProcessingStrategy,
    ];
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
      // Validate event type
      if (!this.isValidMessageQueueEvent(meta.eventType)) {
        this.logger.debug(
          { eventType: meta.eventType },
          'Skipping non-MessageQueue event',
        );
        return;
      }

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
        'Successfully processed and routed MessageQueue event',
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
    const jobOptions = strategy.getJobOptions(eventData);
    const jobData = strategy.transformData(eventData, user);

    // Get the appropriate queue
    const queue = this.getQueueByName(queueName);

    if (!queue) {
      this.logger.error({ queueName }, 'Queue not found for routing strategy');
      return;
    }

    // Add job to queue
    const job = await queue.add(jobType, jobData, jobOptions);

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
   * Check if event type is a valid message queue event
   */
  private isValidMessageQueueEvent(eventType: string): boolean {
    const validEventTypes = [
      MessageQueueApplicationCreatedEvent.EVENT_TYPE,
      'MessageQueueCreatedEvent',
      'MessageQueueScheduledEvent',
      'MessageQueueUpdatedEvent',
      // Transaction events that should trigger notifications
      'transaction.created.v1',
      'transaction.completed.v1',
      'transaction.failed.v1',
      'transaction.queued.v1',
      'transaction.retrying.v1',
    ];

    return validEventTypes.some((validType) =>
      eventType.toLowerCase().includes(validType.toLowerCase()),
    );
  }

  /**
   * Extract tenant from stream name
   */
  private extractTenantFromStream(streamName: string): string | null {
    const parts = streamName.split('-');
    return parts.length >= 2 ? parts[1] : null;
  }
}
