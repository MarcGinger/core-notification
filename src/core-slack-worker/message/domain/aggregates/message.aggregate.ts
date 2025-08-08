/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { AggregateRoot } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { IAggregateWithDto } from 'src/shared/domain/domain.model';
import { IMessage, MessageStatusEnum } from '../entities';
import {
  MessageCreatedEvent,
  MessageDeliveredEvent,
  MessageDeliveryFailedEvent,
  MessageQueuedEvent,
  MessageRetryingEvent,
  MessageScheduledEvent,
  MessageUpdatedEvent,
} from '../events';
import { MessageDomainException, MessageExceptionMessage } from '../exceptions';
import { MessageProps } from '../properties';
import { MessageIdentifier } from '../value-objects';
import { ScheduledAt } from '../value-objects/scheduled-at';

export class Message
  extends AggregateRoot
  implements IAggregateWithDto<IMessage>
{
  private readonly _id: MessageIdentifier;
  private readonly _configCode: string;
  private readonly _channel: string;
  private readonly _templateCode?: string;
  private readonly _payload?: Record<string, any>;
  private _renderedMessage?: string;
  private _status: MessageStatusEnum;
  private _priority?: number;
  private _scheduledAt?: ScheduledAt;
  private _sentAt?: Date;
  private _failureReason?: string;
  private _correlationId?: string;
  private _retryCount: number;

  constructor(props: MessageProps) {
    super();
    this._id = props.id;
    this._configCode = props.configCode;
    this._channel = props.channel;
    this._templateCode = props.templateCode;
    this._payload = props.payload;
    this._renderedMessage = props.renderedMessage;
    this._status = props.status;
    this._scheduledAt = props.scheduledAt;
    this._sentAt = props.sentAt;
    this._failureReason = props.failureReason;
    this._correlationId = props.correlationId;
    this._retryCount = props.retryCount;
    this.validateState();
  }

  getId(): string {
    return this._id.toString();
  }

  get id(): MessageIdentifier {
    return this._id;
  }

  public get configCode(): string {
    return this._configCode;
  }

  public get channel(): string {
    return this._channel;
  }

  public get templateCode(): string | undefined {
    return this._templateCode;
  }

  public get payload(): Record<string, any> | undefined {
    return this._payload;
  }

  public get renderedMessage(): string | undefined {
    return this._renderedMessage;
  }

  public get status(): MessageStatusEnum {
    return this._status;
  }

  public get priority(): number | undefined {
    return this._priority;
  }

  public get scheduledAt(): ScheduledAt | undefined {
    return this._scheduledAt;
  }

  public get sentAt(): Date | undefined {
    return this._sentAt;
  }

  public get failureReason(): string | undefined {
    return this._failureReason;
  }

  public get correlationId(): string | undefined {
    return this._correlationId;
  }

  public get retryCount(): number {
    return this._retryCount;
  }

  /**
   * Factory method for reconstructing Message aggregate from persisted entity data
   * This ensures proper value object creation during repository hydration
   * @param entity - The persisted message entity from repository
   * @returns Properly reconstructed Message aggregate
   */
  public static fromEntity(entity: IMessage): Message {
    const props: MessageProps = {
      id: MessageIdentifier.fromString(entity.id),
      configCode: entity.configCode,
      channel: entity.channel,
      templateCode: entity.templateCode,
      payload: entity.payload,
      renderedMessage: entity.renderedMessage,
      status: entity.status,
      priority: entity.priority,
      scheduledAt: ScheduledAt.create(entity.scheduledAt),
      sentAt: entity.sentAt,
      failureReason: entity.failureReason,
      correlationId: entity.correlationId,
      retryCount: entity.retryCount,
    };

    return new Message(props);
  }

  public toDto(): IMessage {
    return {
      id: this._id.value,
      configCode: this._configCode,
      channel: this._channel,
      templateCode: this._templateCode,
      payload: this._payload,
      renderedMessage: this._renderedMessage,
      status: this._status,
      priority: this._priority,
      scheduledAt: this._scheduledAt?.getValue(),
      sentAt: this._sentAt,
      failureReason: this._failureReason,
      correlationId: this._correlationId,
      retryCount: this._retryCount,
    };
  }

  // ===================================================================
  // 🏗️ CREATION FACTORY METHODS
  // ===================================================================

  /**
   * Factory method to create a new Message aggregate for immediate sending
   * @param user - The user creating the message
   * @param props - The message properties
   * @returns A new Message aggregate with MessageCreatedEvent applied
   */
  static create(user: IUserToken, props: MessageProps): Message {
    const message = new Message(props);

    // Emit creation event for event sourcing
    message.apply(
      new MessageCreatedEvent(user, message.getId(), message.toDto()),
    );

    return message;
  }

  /**
   * Factory method to create a new scheduled Message aggregate
   * @param user - The user creating the message
   * @param props - The message properties
   * @param scheduledAt - When the message should be sent
   * @returns A new Message aggregate with MessageCreatedEvent applied
   */
  static createScheduled(
    user: IUserToken,
    props: MessageProps,
    scheduledAt: Date,
  ): Message {
    const scheduledProps = {
      ...props,
      status: MessageStatusEnum.SCHEDULED,
      scheduledAt: ScheduledAt.create(scheduledAt),
    };

    const message = new Message(scheduledProps);

    // Emit creation event for event sourcing
    message.apply(
      new MessageCreatedEvent(user, message.getId(), message.toDto()),
    );

    return message;
  }

  // ===================================================================
  // 📋 BUSINESS LIFECYCLE OPERATIONS
  // ===================================================================

  /**
   * Marks the message as successfully delivered
   * @param user - The user performing the operation
   */
  markAsDelivered(user: IUserToken): void {
    this.updateStatus(user, MessageStatusEnum.SUCCESS);
  }

  /**
   * Marks the message as queued for processing
   * @param user - The user performing the operation
   * @param jobId - The queue job ID
   * @param priority - The queue priority
   */
  markAsQueued(user: IUserToken, jobId: string, priority: number): void {
    const previousStatus = this._status;
    this.updateStatus(user, MessageStatusEnum.PENDING);

    // Emit specific queued event with additional metadata
    this.apply(
      new MessageQueuedEvent(
        user,
        this.getId(),
        this.toDto(),
        new Date(),
        jobId,
        priority,
        previousStatus,
      ),
    );
  }

  /**
   * Marks the message as failed with a specific reason
   * @param user - The user performing the operation
   * @param reason - The failure reason
   */
  markAsFailed(user: IUserToken, reason: string): void {
    this.updateFailureReason(user, reason);
    this.updateStatus(user, MessageStatusEnum.FAILED);
  }

  /**
   * Marks the message for retry with incremented retry count
   * @param user - The user performing the operation
   * @param reason - The reason for retry
   * @param nextRetryAt - When to retry next (optional)
   */
  markForRetry(user: IUserToken, reason: string, nextRetryAt?: Date): void {
    this.updateFailureReason(user, reason);
    this.updateRetryCount(user, this._retryCount + 1);
    if (nextRetryAt) {
      this.updateScheduledAt(user, nextRetryAt);
    }
    this.updateStatus(user, MessageStatusEnum.RETRYING);
  }

  /**
   * Reschedules the message for a different time
   * @param user - The user performing the operation
   * @param newScheduledAt - The new scheduled time
   */
  reschedule(user: IUserToken, newScheduledAt: Date): void {
    this.updateScheduledAt(user, newScheduledAt);
    this.updateStatus(user, MessageStatusEnum.SCHEDULED);
  }

  // ===================================================================
  // 🔧 INTERNAL STATE MANAGEMENT
  // ===================================================================

  /**
   * Updates the Rendered message property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param renderedMessage - The new Rendered message value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageDomainException} When validation fails or business rules are violated
   */
  public updateRenderedMessage(
    user: IUserToken,
    renderedMessage?: string,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldRenderedMessage = this._renderedMessage;
    this._renderedMessage = renderedMessage;

    // Emit event only if value actually changed
    if (oldRenderedMessage !== this._renderedMessage && emitEvent) {
      this.validateState();
      this.apply(new MessageUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Scheduled at property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param scheduledAt - The new Scheduled at value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageDomainException} When validation fails or business rules are violated
   */
  public updateScheduledAt(
    user: IUserToken,
    scheduledAt?: Date,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldScheduledAt = this._scheduledAt;
    this._scheduledAt = ScheduledAt.create(scheduledAt);

    // Emit event only if value actually changed
    if (oldScheduledAt !== this._scheduledAt && emitEvent) {
      this.validateState();
      this.apply(new MessageUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Sent at property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param sentAt - The new Sent at value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageDomainException} When validation fails or business rules are violated
   */
  public updateSentAt(
    user: IUserToken,
    sentAt?: Date,
    emitEvent = false,
  ): void {
    // Changed default to false to avoid generic events
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldSentAt = this._sentAt;
    this._sentAt = sentAt;

    // Emit event only if value actually changed
    if (oldSentAt !== this._sentAt && emitEvent) {
      this.validateState();
      this.apply(new MessageUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Failure reason property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param failureReason - The new Failure reason value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageDomainException} When validation fails or business rules are violated
   */
  public updateFailureReason(
    user: IUserToken,
    failureReason?: string,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldFailureReason = this._failureReason;
    this._failureReason = failureReason;

    // Emit event only if value actually changed
    if (oldFailureReason !== this._failureReason && emitEvent) {
      this.validateState();
      this.apply(new MessageUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Correlation id property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param correlationId - The new Correlation id value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageDomainException} When validation fails or business rules are violated
   */
  public updateCorrelationId(
    user: IUserToken,
    correlationId?: string,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldCorrelationId = this._correlationId;
    this._correlationId = correlationId;

    // Emit event only if value actually changed
    if (oldCorrelationId !== this._correlationId && emitEvent) {
      this.validateState();
      this.apply(new MessageUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Retry count property of the message.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits MessageUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param retryCount - The new Retry count value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageDomainException} When validation fails or business rules are violated
   */
  public updateRetryCount(
    user: IUserToken,
    retryCount: number,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForUpdates,
      );
    }

    // Validate required number field
    if (retryCount === undefined || retryCount === null) {
      // throw new MessageDomainException(
      //   MessageExceptionMessage.fieldRetryCountRequired,
      // );
    }

    const oldRetryCount = this._retryCount;
    this._retryCount = retryCount;

    // Emit event only if value actually changed
    if (oldRetryCount !== this._retryCount && emitEvent) {
      this.validateState();
      this.apply(new MessageUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the status of the message.
   * Business rules:
   * - Idempotent operation (no-op if status is the same)
   * - Emits specific domain events based on status transition
   * - Validates aggregate state after status change
   * @param user - The user performing the operation
   * @param status - The new status value
   * @throws {MessageDomainException} When user context is invalid or status is invalid
   */
  updateStatus(user: IUserToken, status: MessageStatusEnum): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForStatus,
      );
    }

    // Validate status value
    if (!status) {
      throw new MessageDomainException(
        MessageExceptionMessage.invalidStatusValue,
      );
    }

    // No-op if status is the same (idempotent operation)
    if (this._status === status) {
      return; // No change needed
    }

    // Store previous status for event context
    const previousStatus = this._status;

    // Update status and emit specific event based on new status
    this._status = status;

    // Emit specific domain event based on the status transition
    this.emitStatusSpecificEvent(user, status, previousStatus);

    this.validateState();
  }

  /**
   * Emits the appropriate domain event based on the status transition
   * @param user - The user performing the operation
   * @param newStatus - The new status being set
   * @param previousStatus - The previous status before the change
   */
  private emitStatusSpecificEvent(
    user: IUserToken,
    newStatus: MessageStatusEnum,
    previousStatus: MessageStatusEnum,
  ): void {
    const messageDto = this.toDto();
    const now = new Date();

    switch (newStatus) {
      case MessageStatusEnum.SUCCESS:
        this._sentAt = now;
        this.apply(
          new MessageDeliveredEvent(
            user,
            this.getId(),
            messageDto,
            now,
            previousStatus,
          ),
        );
        break;

      case MessageStatusEnum.FAILED:
        this.apply(
          new MessageDeliveryFailedEvent(
            user,
            this.getId(),
            messageDto,
            this._failureReason || 'Unknown failure',
            true, // isRetryable - could be made configurable
            this._retryCount,
            previousStatus,
          ),
        );
        break;

      case MessageStatusEnum.SCHEDULED:
        this.apply(
          new MessageScheduledEvent(
            user,
            this.getId(),
            messageDto,
            this._scheduledAt?.getValue() || now,
            previousStatus,
          ),
        );
        break;

      case MessageStatusEnum.RETRYING: {
        const delay = new Date(Date.now() + 60000); // default 1 minute retry
        this.apply(
          new MessageRetryingEvent(
            user,
            this.getId(),
            messageDto,
            this._retryCount,
            delay,
            previousStatus,
            this._failureReason,
          ),
        );
        break;
      }

      default:
        // For any other status changes, fall back to generic event
        this.apply(new MessageUpdatedEvent(user, this.getId(), messageDto));
        break;
    }
  }

  // ===================================================================
  // 🗑️ DELETION OPERATIONS
  // ===================================================================

  /**
   * Marks the message for deletion.
   * This method initiates the deletion process and emits the appropriate domain event.
   * Business rules:
   * - User context is required
   * - Cannot delete default messages
   * - Emits MessageDeletedEvent to trigger deletion workflows
   * @param user - The user performing the deletion operation
   * @throws {MessageDomainException} When user context is invalid or business rules are violated
   */
  markForDeletion(user: IUserToken): void {
    // Validate user context
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForDeletion,
      );
    }
  }

  // ===================================================================
  // 🔍 VALIDATION & UTILITY METHODS
  // ===================================================================

  private validateState(): void {
    if (!this._id) {
      throw new MessageDomainException(MessageExceptionMessage.fieldIdRequired);
    }

    if (!this._configCode) {
      throw new MessageDomainException(
        MessageExceptionMessage.fieldConfigCodeRequired,
      );
    }

    if (!this._channel) {
      throw new MessageDomainException(
        MessageExceptionMessage.fieldChannelRequired,
      );
    }

    if (!this._status) {
      throw new MessageDomainException(
        MessageExceptionMessage.fieldStatusRequired,
      );
    }

    if (this._scheduledAt) {
      // throw new MessageDomainException(
      //   MessageExceptionMessage.fieldRetryCountRequired,
      // );
    }
  }

  public toProps(): MessageProps {
    return {
      id: this._id,
      configCode: this._configCode,
      channel: this._channel,
      templateCode: this._templateCode,
      payload: this._payload,
      renderedMessage: this._renderedMessage,
      status: this._status,
      scheduledAt: this._scheduledAt,
      sentAt: this._sentAt,
      failureReason: this._failureReason,
      correlationId: this._correlationId,
      retryCount: this._retryCount,
    };
  }
}
