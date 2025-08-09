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
import { IMessageQueue, MessageQueueStatusEnum } from '../entities';
import {
  MessageQueueCreatedEvent,
  MessageQueueDeliveredEvent,
  MessageQueueDeliveryFailedEvent,
  MessageQueueQueuedEvent,
  MessageQueueRetryingEvent,
  MessageQueueScheduledEvent,
  MessageQueueUpdatedEvent,
} from '../events';
import {
  MessageQueueDomainException,
  MessageQueueExceptionMessageQueue,
} from '../exceptions';
import { MessageQueueProps } from '../properties';
import { MessageQueueIdentifier, ScheduledAt } from '../value-objects';

export class MessageQueue
  extends AggregateRoot
  implements IAggregateWithDto<IMessageQueue>
{
  private readonly _id: MessageQueueIdentifier;
  private readonly _payload?: Record<string, any>;
  private _status: MessageQueueStatusEnum;
  private _priority?: number;
  private _scheduledAt?: ScheduledAt;
  private _sentAt?: Date;
  private _failureReason?: string;
  private _correlationId?: string;
  private _retryCount: number;

  constructor(props: MessageQueueProps) {
    super();
    this._id = props.id;
    this._payload = props.payload;
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

  get id(): MessageQueueIdentifier {
    return this._id;
  }

  public get payload(): Record<string, any> | undefined {
    return this._payload;
  }

  public get status(): MessageQueueStatusEnum {
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
   * Factory method for reconstructing MessageQueue aggregate from persisted entity data
   * This ensures proper value object creation during repository hydration
   * @param entity - The persisted message entity from repository
   * @returns Properly reconstructed MessageQueue aggregate
   */
  public static fromEntity(entity: IMessageQueue): MessageQueue {
    const props: MessageQueueProps = {
      id: MessageQueueIdentifier.fromString(entity.id),
      status: entity.status,
      priority: entity.priority,
      scheduledAt: ScheduledAt.create(entity.scheduledAt),
      sentAt: entity.sentAt,
      failureReason: entity.failureReason,
      correlationId: entity.correlationId,
      retryCount: entity.retryCount,
    };

    return new MessageQueue(props);
  }

  public toDto(): IMessageQueue {
    return {
      id: this._id.value,
      status: this._status,
      priority: this._priority,
      scheduledAt: this._scheduledAt?.getValue(),
      payload: this._payload,
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
   * Factory method to create a new MessageQueue aggregate for immediate sending
   * @param user - The user creating the message
   * @param props - The message properties
   * @returns A new MessageQueue aggregate with MessageQueueCreatedEvent applied
   */
  static create(user: IUserToken, props: MessageQueueProps): MessageQueue {
    const message = new MessageQueue(props);

    // Emit creation event for event sourcing
    message.apply(
      new MessageQueueCreatedEvent(user, message.getId(), message.toDto()),
    );

    return message;
  }

  /**
   * Factory method to create a new scheduled MessageQueue aggregate
   * @param user - The user creating the message
   * @param props - The message properties
   * @param scheduledAt - When the message should be sent
   * @returns A new MessageQueue aggregate with MessageQueueCreatedEvent applied
   */
  static createScheduled(
    user: IUserToken,
    props: MessageQueueProps,
    scheduledAt: Date,
  ): MessageQueue {
    const scheduledProps = {
      ...props,
      status: MessageQueueStatusEnum.SCHEDULED,
      scheduledAt: ScheduledAt.create(scheduledAt),
    };

    const message = new MessageQueue(scheduledProps);

    // Emit creation event for event sourcing
    message.apply(
      new MessageQueueCreatedEvent(user, message.getId(), message.toDto()),
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
    this.updateStatus(user, MessageQueueStatusEnum.SUCCESS);
  }

  /**
   * Marks the message as queued for processing
   * @param user - The user performing the operation
   * @param jobId - The queue job ID
   * @param priority - The queue priority
   */
  markAsQueued(user: IUserToken, jobId: string, priority: number): void {
    const previousStatus = this._status;
    this.updateStatus(user, MessageQueueStatusEnum.PENDING);

    // Emit specific queued event with additional metadata
    this.apply(
      new MessageQueueQueuedEvent(
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
    this.updateStatus(user, MessageQueueStatusEnum.FAILED);
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
    this.updateStatus(user, MessageQueueStatusEnum.RETRYING);
  }

  /**
   * Reschedules the message for a different time
   * @param user - The user performing the operation
   * @param newScheduledAt - The new scheduled time
   */
  reschedule(user: IUserToken, newScheduledAt: Date): void {
    this.updateScheduledAt(user, newScheduledAt);
    this.updateStatus(user, MessageQueueStatusEnum.SCHEDULED);
  }

  // ===================================================================
  // 🔧 INTERNAL STATE MANAGEMENT
  // ===================================================================

  /**
   * Updates the Scheduled at property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageQueueUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param scheduledAt - The new Scheduled at value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageQueueDomainException} When validation fails or business rules are violated
   */
  public updateScheduledAt(
    user: IUserToken,
    scheduledAt?: Date,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForUpdates,
      );
    }

    const oldScheduledAt = this._scheduledAt;
    this._scheduledAt = ScheduledAt.create(scheduledAt);

    // Emit event only if value actually changed
    if (oldScheduledAt !== this._scheduledAt && emitEvent) {
      this.validateState();
      this.apply(
        new MessageQueueUpdatedEvent(user, this.getId(), this.toDto()),
      );
    }
  }

  /**
   * Updates the Sent at property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageQueueUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param sentAt - The new Sent at value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageQueueDomainException} When validation fails or business rules are violated
   */
  public updateSentAt(
    user: IUserToken,
    sentAt?: Date,
    emitEvent = false,
  ): void {
    // Changed default to false to avoid generic events
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForUpdates,
      );
    }

    const oldSentAt = this._sentAt;
    this._sentAt = sentAt;

    // Emit event only if value actually changed
    if (oldSentAt !== this._sentAt && emitEvent) {
      this.validateState();
      this.apply(
        new MessageQueueUpdatedEvent(user, this.getId(), this.toDto()),
      );
    }
  }

  /**
   * Updates the Failure reason property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageQueueUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param failureReason - The new Failure reason value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageQueueDomainException} When validation fails or business rules are violated
   */
  public updateFailureReason(
    user: IUserToken,
    failureReason?: string,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForUpdates,
      );
    }

    const oldFailureReason = this._failureReason;
    this._failureReason = failureReason;

    // Emit event only if value actually changed
    if (oldFailureReason !== this._failureReason && emitEvent) {
      this.validateState();
      this.apply(
        new MessageQueueUpdatedEvent(user, this.getId(), this.toDto()),
      );
    }
  }

  /**
   * Updates the Correlation id property of the message.
   * Business rules:
   * - Value is optional
   * - Emits MessageQueueUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param correlationId - The new Correlation id value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageQueueDomainException} When validation fails or business rules are violated
   */
  public updateCorrelationId(
    user: IUserToken,
    correlationId?: string,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForUpdates,
      );
    }

    const oldCorrelationId = this._correlationId;
    this._correlationId = correlationId;

    // Emit event only if value actually changed
    if (oldCorrelationId !== this._correlationId && emitEvent) {
      this.validateState();
      this.apply(
        new MessageQueueUpdatedEvent(user, this.getId(), this.toDto()),
      );
    }
  }

  /**
   * Updates the Retry count property of the message.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits MessageQueueUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param retryCount - The new Retry count value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MessageQueueDomainException} When validation fails or business rules are violated
   */
  public updateRetryCount(
    user: IUserToken,
    retryCount: number,
    emitEvent = false, // Changed default to false to avoid generic events
  ): void {
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForUpdates,
      );
    }

    // Validate required number field
    if (retryCount === undefined || retryCount === null) {
      // throw new MessageQueueDomainException(
      //   MessageQueueExceptionMessageQueue.fieldRetryCountRequired,
      // );
    }

    const oldRetryCount = this._retryCount;
    this._retryCount = retryCount;

    // Emit event only if value actually changed
    if (oldRetryCount !== this._retryCount && emitEvent) {
      this.validateState();
      this.apply(
        new MessageQueueUpdatedEvent(user, this.getId(), this.toDto()),
      );
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
   * @throws {MessageQueueDomainException} When user context is invalid or status is invalid
   */
  updateStatus(user: IUserToken, status: MessageQueueStatusEnum): void {
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForStatus,
      );
    }

    // Validate status value
    if (!status) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.invalidStatusValue,
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
    newStatus: MessageQueueStatusEnum,
    previousStatus: MessageQueueStatusEnum,
  ): void {
    const messageDto = this.toDto();
    const now = new Date();

    switch (newStatus) {
      case MessageQueueStatusEnum.SUCCESS:
        this._sentAt = now;
        this.apply(
          new MessageQueueDeliveredEvent(
            user,
            this.getId(),
            messageDto,
            now,
            previousStatus,
          ),
        );
        break;

      case MessageQueueStatusEnum.FAILED:
        this.apply(
          new MessageQueueDeliveryFailedEvent(
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

      case MessageQueueStatusEnum.SCHEDULED:
        this.apply(
          new MessageQueueScheduledEvent(
            user,
            this.getId(),
            messageDto,
            this._scheduledAt?.getValue() || now,
            previousStatus,
          ),
        );
        break;

      case MessageQueueStatusEnum.RETRYING: {
        const delay = new Date(Date.now() + 60000); // default 1 minute retry
        this.apply(
          new MessageQueueRetryingEvent(
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
        this.apply(
          new MessageQueueUpdatedEvent(user, this.getId(), messageDto),
        );
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
   * - Emits MessageQueueDeletedEvent to trigger deletion workflows
   * @param user - The user performing the deletion operation
   * @throws {MessageQueueDomainException} When user context is invalid or business rules are violated
   */
  markForDeletion(user: IUserToken): void {
    // Validate user context
    if (!user) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.userRequiredForDeletion,
      );
    }
  }

  // ===================================================================
  // 🔍 VALIDATION & UTILITY METHODS
  // ===================================================================

  private validateState(): void {
    if (!this._id) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.fieldIdRequired,
      );
    }

    if (!this._status) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.fieldStatusRequired,
      );
    }
  }

  public toProps(): MessageQueueProps {
    return {
      id: this._id,
      payload: this._payload,
      status: this._status,
      scheduledAt: this._scheduledAt,
      sentAt: this._sentAt,
      failureReason: this._failureReason,
      correlationId: this._correlationId,
      retryCount: this._retryCount,
    };
  }
}
