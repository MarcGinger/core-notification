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
import { IMaker, MakerStatusEnum } from '../entities';
import { MakerDomainException, MakerExceptionMessage } from '../exceptions';
import { MakerProps } from '../properties';
import { IAggregateWithDto } from 'src/shared/domain/domain.model';
import { MakerIdentifier } from '../value-objects';
import { MakerCreatedEvent, MakerUpdatedEvent } from '../events';

export class Maker extends AggregateRoot implements IAggregateWithDto<IMaker> {
  private readonly _id: MakerIdentifier;
  private _from: string;
  private _to: string;
  private _description?: string;
  private _amount: Date;
  private _status?: MakerStatusEnum;
  private _scheduledAt?: Date;
  private _correlationId?: string;

  constructor(props: MakerProps) {
    super();
    this._id = props.id;
    this._from = props.from;
    this._to = props.to;
    this._description = props.description;
    this._amount = props.amount;
    this._status = props.status;
    this._scheduledAt = props.scheduledAt;
    this._correlationId = props.correlationId;
    this.validateState();
  }

  getId(): string {
    return this._id.toString();
  }

  get id(): MakerIdentifier {
    return this._id;
  }

  public get from(): string {
    return this._from;
  }

  public get to(): string {
    return this._to;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public get amount(): Date {
    return this._amount;
  }

  public get status(): MakerStatusEnum | undefined {
    return this._status;
  }

  public get scheduledAt(): Date | undefined {
    return this._scheduledAt;
  }

  public get correlationId(): string | undefined {
    return this._correlationId;
  }

  /**
   * Factory method for reconstructing Maker aggregate from persisted entity data
   * This ensures proper value object creation during repository hydration
   * @param entity - The persisted maker entity from repository
   * @returns Properly reconstructed Maker aggregate
   */
  public static fromEntity(entity: IMaker): Maker {
    const props: MakerProps = {
      id: MakerIdentifier.fromString(entity.id),
      from: entity.from,
      to: entity.to,
      description: entity.description,
      amount: entity.amount,
      status: entity.status,
      scheduledAt: entity.scheduledAt,
      correlationId: entity.correlationId,
    };

    return new Maker(props);
  }

  public toDto(): IMaker {
    return {
      id: this._id.value,
      from: this._from,
      to: this._to,
      description: this._description,
      amount: this._amount,
      status: this._status,
      scheduledAt: this._scheduledAt,
      correlationId: this._correlationId,
    };
  }

  /**
   * Factory method to create a new Maker aggregate with proper event sourcing
   * Use this method instead of the constructor when creating new makers
   * @param user - The user creating the maker
   * @param props - The maker properties
   * @returns A new Maker aggregate with MakerCreatedEvent applied
   */
  static create(user: IUserToken, props: MakerProps): Maker {
    const maker = new Maker(props);

    // Emit creation event for event sourcing
    maker.apply(new MakerCreatedEvent(user, maker.getId(), maker.toDto()));

    return maker;
  }

  /**
   * Updates the From property of the maker.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits MakerUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param from - The new From value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MakerDomainException} When validation fails or business rules are violated
   */
  public updateFrom(user: IUserToken, from: string, emitEvent = true): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForUpdates,
      );
    }

    // Validate required string field
    if (!from || from.trim() === '') {
      throw new MakerDomainException(MakerExceptionMessage.fieldFromRequired);
    }

    const oldFrom = this._from;
    this._from = from.trim();

    // Emit event only if value actually changed
    if (oldFrom !== this._from && emitEvent) {
      this.validateState();
      this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the To property of the maker.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits MakerUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param to - The new To value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MakerDomainException} When validation fails or business rules are violated
   */
  public updateTo(user: IUserToken, to: string, emitEvent = true): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForUpdates,
      );
    }

    // Validate required string field
    if (!to || to.trim() === '') {
      throw new MakerDomainException(MakerExceptionMessage.fieldToRequired);
    }

    const oldTo = this._to;
    this._to = to.trim();

    // Emit event only if value actually changed
    if (oldTo !== this._to && emitEvent) {
      this.validateState();
      this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Description property of the maker.
   * Business rules:
   * - Value is optional
   * - Emits MakerUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param description - The new Description value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MakerDomainException} When validation fails or business rules are violated
   */
  public updateDescription(
    user: IUserToken,
    description?: string,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldDescription = this._description;
    this._description = description;

    // Emit event only if value actually changed
    if (oldDescription !== this._description && emitEvent) {
      this.validateState();
      this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Amount property of the maker.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits MakerUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param amount - The new Amount value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MakerDomainException} When validation fails or business rules are violated
   */
  public updateAmount(user: IUserToken, amount: Date, emitEvent = true): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldAmount = this._amount;
    this._amount = amount;

    // Emit event only if value actually changed
    if (oldAmount !== this._amount && emitEvent) {
      this.validateState();
      this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Scheduled at property of the maker.
   * Business rules:
   * - Value is optional
   * - Emits MakerUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param scheduledAt - The new Scheduled at value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MakerDomainException} When validation fails or business rules are violated
   */
  public updateScheduledAt(
    user: IUserToken,
    scheduledAt?: Date,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldScheduledAt = this._scheduledAt;
    this._scheduledAt = scheduledAt;

    // Emit event only if value actually changed
    if (oldScheduledAt !== this._scheduledAt && emitEvent) {
      this.validateState();
      this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the Correlation id property of the maker.
   * Business rules:
   * - Value is optional
   * - Emits MakerUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param correlationId - The new Correlation id value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {MakerDomainException} When validation fails or business rules are violated
   */
  public updateCorrelationId(
    user: IUserToken,
    correlationId?: string,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldCorrelationId = this._correlationId;
    this._correlationId = correlationId;

    // Emit event only if value actually changed
    if (oldCorrelationId !== this._correlationId && emitEvent) {
      this.validateState();
      this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    }
  }

  /**
   * Updates the status of the maker.
   * Business rules:
   * - Idempotent operation (no-op if status is the same)
   * - Emits MakerUpdatedEvent on status change
   * - Validates aggregate state after status change
   * @param user - The user performing the operation
   * @param status - The new status value
   * @throws {MakerDomainException} When user context is invalid or status is invalid
   */
  updateStatus(user: IUserToken, status: MakerStatusEnum): void {
    // Validate user context
    if (!user) {
      throw new MakerDomainException(
        MakerExceptionMessage.userRequiredForStatus,
      );
    }

    // Validate status value
    if (!status) {
      throw new MakerDomainException(MakerExceptionMessage.invalidStatusValue);
    }

    // No-op if status is the same (idempotent operation)
    if (this._status === status) {
      return; // No change needed
    }

    // Update status and emit event
    this._status = status;
    this.apply(new MakerUpdatedEvent(user, this.getId(), this.toDto()));
    this.validateState();
  }

  private validateState(): void {
    if (!this._id) {
      throw new MakerDomainException(MakerExceptionMessage.fieldIdRequired);
    }

    if (!this._from) {
      throw new MakerDomainException(MakerExceptionMessage.fieldFromRequired);
    }

    if (!this._to) {
      throw new MakerDomainException(MakerExceptionMessage.fieldToRequired);
    }

    if (!this._amount) {
      throw new MakerDomainException(MakerExceptionMessage.fieldAmountRequired);
    }
  }

  public toProps(): MakerProps {
    return {
      id: this._id,
      from: this._from,
      to: this._to,
      description: this._description,
      amount: this._amount,
      status: this._status,
      scheduledAt: this._scheduledAt,
      correlationId: this._correlationId,
    };
  }
}
