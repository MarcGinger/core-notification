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
import { ITransaction, TransactionStatusEnum } from '../entities';
import {
  TransactionCompletedEvent,
  TransactionCreatedEvent,
  TransactionFailedEvent,
  TransactionQueuedEvent,
  TransactionRetryingEvent,
  TransactionScheduledEvent,
  TransactionUpdatedEvent,
} from '../events';
import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';
import { TransactionProps } from '../properties';
import { TransactionIdentifier } from '../value-objects';

export class Transaction
  extends AggregateRoot
  implements IAggregateWithDto<ITransaction>
{
  private readonly _id: TransactionIdentifier;
  private _from: string;
  private _to: string;
  private _amount: number;
  private _status: TransactionStatusEnum;
  private _scheduledAt?: Date;
  private _processedAt?: Date;
  private _failureReason?: string;
  private _correlationId?: string;
  private _retryCount: number;
  private _priority?: number;

  constructor(props: TransactionProps) {
    super();
    this._id = props.id;
    this._from = props.from;
    this._to = props.to;
    this._amount = props.amount;
    this._status = props.status;
    this._scheduledAt = props.scheduledAt;
    this._processedAt = props.processedAt;
    this._failureReason = props.failureReason;
    this._correlationId = props.correlationId;
    this._retryCount = props.retryCount;
    this._priority = props.priority;
    this.validateState();
  }

  getId(): string {
    return this._id.toString();
  }

  get id(): TransactionIdentifier {
    return this._id;
  }

  public get from(): string {
    return this._from;
  }

  public get to(): string {
    return this._to;
  }

  public get amount(): number {
    return this._amount;
  }

  public get status(): TransactionStatusEnum {
    return this._status;
  }

  public get scheduledAt(): Date | undefined {
    return this._scheduledAt;
  }

  public get processedAt(): Date | undefined {
    return this._processedAt;
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

  public get priority(): number | undefined {
    return this._priority;
  }

  /**
   * Factory method for reconstructing Transaction aggregate from persisted entity data
   * This ensures proper value object creation during repository hydration
   * @param entity - The persisted transaction entity from repository
   * @returns Properly reconstructed Transaction aggregate
   */
  public static fromEntity(entity: ITransaction): Transaction {
    const props: TransactionProps = {
      id: TransactionIdentifier.fromString(entity.id),
      from: entity.from,
      to: entity.to,
      amount: entity.amount,
      status: entity.status,
      scheduledAt: entity.scheduledAt,
      processedAt: entity.processedAt,
      failureReason: entity.failureReason,
      correlationId: entity.correlationId,
      retryCount: entity.retryCount,
      priority: entity.priority,
    };

    return new Transaction(props);
  }

  public toDto(): ITransaction {
    return {
      id: this._id.value,
      from: this._from,
      to: this._to,
      amount: this._amount,
      status: this._status,
      scheduledAt: this._scheduledAt,
      processedAt: this._processedAt,
      failureReason: this._failureReason,
      correlationId: this._correlationId,
      retryCount: this._retryCount,
      priority: this._priority,
    };
  }

  /**
   * Factory method to create a new Transaction aggregate with proper event sourcing
   * Use this method instead of the constructor when creating new transactions
   * @param user - The user creating the transaction
   * @param props - The transaction properties
   * @returns A new Transaction aggregate with TransactionCreatedEvent applied
   */
  static create(user: IUserToken, props: TransactionProps): Transaction {
    const transaction = new Transaction(props);

    // Emit creation event for event sourcing
    transaction.apply(
      new TransactionCreatedEvent(
        user,
        transaction.getId(),
        transaction.toDto(),
      ),
    );

    return transaction;
  }

  /**
   * Factory method to create a new scheduled Transaction aggregate
   * @param user - The user creating the transaction
   * @param props - The transaction properties
   * @param scheduledAt - When the transaction should be processed
   * @returns A new Transaction aggregate with TransactionCreatedEvent applied
   */
  static createScheduled(
    user: IUserToken,
    props: TransactionProps,
    scheduledAt: Date,
  ): Transaction {
    const scheduledProps = {
      ...props,
      status: TransactionStatusEnum.SCHEDULED,
      scheduledAt: scheduledAt,
    };

    const transaction = new Transaction(scheduledProps);

    // Emit creation event for event sourcing
    transaction.apply(
      new TransactionCreatedEvent(
        user,
        transaction.getId(),
        transaction.toDto(),
      ),
    );

    return transaction;
  }

  // ===================================================================
  // 📋 BUSINESS LIFECYCLE OPERATIONS
  // ===================================================================

  /**
   * Marks the transaction as successfully completed
   * @param user - The user performing the operation
   * @param processingDetails - Optional details about the processing
   */
  markAsCompleted(
    user: IUserToken,
    processingDetails?: Record<string, any>,
  ): void {
    const previousStatus = this._status;
    this._processedAt = new Date();
    this.updateStatus(user, TransactionStatusEnum.SUCCESS);

    // Emit specific completion event
    this.apply(
      new TransactionCompletedEvent(
        user,
        this.getId(),
        this.toDto(),
        this._processedAt,
        previousStatus,
        processingDetails,
      ),
    );
  }

  /**
   * Marks the transaction as queued for processing
   * @param user - The user performing the operation
   * @param jobId - The queue job ID
   * @param priority - The queue priority
   */
  markAsQueued(user: IUserToken, jobId: string, priority: number): void {
    const previousStatus = this._status;
    this._priority = priority;
    this.updateStatus(user, TransactionStatusEnum.PENDING);

    // Emit specific queued event with additional metadata
    this.apply(
      new TransactionQueuedEvent(
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
   * Marks the transaction as failed with a specific reason
   * @param user - The user performing the operation
   * @param reason - The failure reason
   */
  markAsFailed(user: IUserToken, reason: string): void {
    const previousStatus = this._status;
    this._failureReason = reason;
    this.updateStatus(user, TransactionStatusEnum.FAILED);

    // Emit specific failure event
    this.apply(
      new TransactionFailedEvent(
        user,
        this.getId(),
        this.toDto(),
        reason,
        false, // not retryable for permanent failures
        this._retryCount,
        previousStatus,
      ),
    );
  }

  /**
   * Marks the transaction for retry with incremented retry count
   * @param user - The user performing the operation
   * @param reason - The reason for retry
   * @param nextRetryAt - When to retry next (optional)
   */
  markForRetry(user: IUserToken, reason: string, nextRetryAt?: Date): void {
    const previousStatus = this._status;
    this._failureReason = reason;
    this._retryCount = this._retryCount + 1;

    if (nextRetryAt) {
      this._scheduledAt = nextRetryAt;
    }

    this.updateStatus(user, TransactionStatusEnum.RETRYING);

    // Emit specific retry event
    this.apply(
      new TransactionRetryingEvent(
        user,
        this.getId(),
        this.toDto(),
        this._retryCount,
        nextRetryAt || new Date(Date.now() + 60000), // default 1 minute
        previousStatus,
        reason,
      ),
    );
  }

  /**
   * Reschedules the transaction for a different time
   * @param user - The user performing the operation
   * @param newScheduledAt - The new scheduled time
   */
  reschedule(user: IUserToken, newScheduledAt: Date): void {
    const previousStatus = this._status;
    this._scheduledAt = newScheduledAt;
    this.updateStatus(user, TransactionStatusEnum.SCHEDULED);

    // Emit specific scheduled event
    this.apply(
      new TransactionScheduledEvent(
        user,
        this.getId(),
        this.toDto(),
        newScheduledAt,
        previousStatus,
      ),
    );
  }

  // ===================================================================
  // 🔧 INTERNAL STATE MANAGEMENT
  // ===================================================================

  /**
   * Updates the status of the transaction.
   * Business rules:
   * - Idempotent operation (no-op if status is the same)
   * - Validates aggregate state after status change
   * @param user - The user performing the operation
   * @param status - The new status value
   * @throws {TransactionDomainException} When user context is invalid or status is invalid
   */
  updateStatus(user: IUserToken, status: TransactionStatusEnum): void {
    // Validate user context
    if (!user) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.userRequiredForStatus,
      );
    }

    // Validate status value
    if (!status) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.invalidStatusValue,
      );
    }

    // No-op if status is the same (idempotent operation)
    if (this._status === status) {
      return; // No change needed
    }

    // Update status
    this._status = status;

    this.validateState();
  }

  /**
   * Updates individual fields and emits update events
   */
  updateCorrelationId(
    user: IUserToken,
    correlationId?: string,
    emitEvent = false,
  ): void {
    if (!user) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldCorrelationId = this._correlationId;
    this._correlationId = correlationId;

    if (oldCorrelationId !== this._correlationId && emitEvent) {
      this.validateState();
      this.apply(
        new TransactionUpdatedEvent(user, this.getId(), this.toDto(), [
          'correlationId',
        ]),
      );
    }
  }

  updateRetryCount(
    user: IUserToken,
    retryCount: number,
    emitEvent = false,
  ): void {
    if (!user) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldRetryCount = this._retryCount;
    this._retryCount = retryCount;

    if (oldRetryCount !== this._retryCount && emitEvent) {
      this.validateState();
      this.apply(
        new TransactionUpdatedEvent(user, this.getId(), this.toDto(), [
          'retryCount',
        ]),
      );
    }
  }

  // ===================================================================
  // 🔍 VALIDATION & UTILITY METHODS
  // ===================================================================

  private validateState(): void {
    if (!this._id) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldIdRequired,
      );
    }

    if (!this._from) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldFromRequired,
      );
    }

    if (!this._to) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldToRequired,
      );
    }

    if (!this._amount) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldAmountRequired,
      );
    }

    if (!this._status) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldStatusRequired,
      );
    }
  }

  public toProps(): TransactionProps {
    return {
      id: this._id,
      from: this._from,
      to: this._to,
      amount: this._amount,
      status: this._status,
      scheduledAt: this._scheduledAt,
      processedAt: this._processedAt,
      failureReason: this._failureReason,
      correlationId: this._correlationId,
      retryCount: this._retryCount,
      priority: this._priority,
    };
  }
}
