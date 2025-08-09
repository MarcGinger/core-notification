/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

/**
 * Value object for MessageQueue identifiers.
 * Extends EntityIdentifier for domain-specific constraints.
 * Implements immutable value object pattern with validation.
 */

import { EntityIdentifier } from 'src/shared/domain/value-objects';
import {
  MessageQueueDomainException,
  MessageQueueExceptionMessageQueue,
} from '../exceptions';

export class MessageQueueIdentifier extends EntityIdentifier<string> {
  private constructor(id: string) {
    super(id);
    this.validate();
  }

  public get value(): string {
    return this._value;
  }

  public static fromString(id: string): MessageQueueIdentifier {
    return new MessageQueueIdentifier(id);
  }

  public static create(id: string): MessageQueueIdentifier {
    return new MessageQueueIdentifier(id);
  }

  public equals(other: MessageQueueIdentifier): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return String(this._value);
  }

  private validate(): void {
    if (!this._value) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.fieldIdRequired,
      );
    }
    if (this._value.trim() === '') {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.fieldIdEmpty,
      );
    }
    // Add more domain-specific validation here if needed
  }
}
