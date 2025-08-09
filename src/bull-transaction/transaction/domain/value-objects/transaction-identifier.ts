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
 * Value object for Transaction identifiers.
 * Extends EntityIdentifier for domain-specific constraints.
 * Implements immutable value object pattern with validation.
 */

import { EntityIdentifier } from 'src/shared/domain/value-objects';
import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';

export class TransactionIdentifier extends EntityIdentifier<string> {
  private constructor(id: string) {
    super(id);
    this.validate();
  }

  public get value(): string {
    return this._value;
  }

  public static fromString(id: string): TransactionIdentifier {
    return new TransactionIdentifier(id);
  }

  public static create(id: string): TransactionIdentifier {
    return new TransactionIdentifier(id);
  }

  public equals(other: TransactionIdentifier): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return String(this._value);
  }

  private validate(): void {
    if (!this._value) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldIdRequired,
      );
    }
    if (this._value.trim() === '') {
      throw new TransactionDomainException(
        TransactionExceptionMessage.fieldIdEmpty,
      );
    }
    // Add more domain-specific validation here if needed
  }
}
