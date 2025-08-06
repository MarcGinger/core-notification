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
 * Value object for Message identifiers.
 * Extends EntityIdentifier for domain-specific constraints.
 * Implements immutable value object pattern with validation.
 */

import { EntityIdentifier } from 'src/shared/domain/value-objects';
import { MessageDomainException, MessageExceptionMessage } from '../exceptions';

export class MessageIdentifier extends EntityIdentifier<string> {
  private constructor(id: string) {
    super(id);
    this.validate();
  }

  public get value(): string {
    return this._value;
  }

  public static fromString(id: string): MessageIdentifier {
    return new MessageIdentifier(id);
  }

  public static create(id: string): MessageIdentifier {
    return new MessageIdentifier(id);
  }

  public equals(other: MessageIdentifier): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return String(this._value);
  }

  private validate(): void {
    if (!this._value) {
      throw new MessageDomainException(MessageExceptionMessage.fieldIdRequired);
    }
    if (this._value.trim() === '') {
      throw new MessageDomainException(MessageExceptionMessage.fieldIdEmpty);
    }
    // Add more domain-specific validation here if needed
  }
}
