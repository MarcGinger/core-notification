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
 * Value object for Maker identifiers.
 * Extends EntityIdentifier for domain-specific constraints.
 * Implements immutable value object pattern with validation.
 */

import { EntityIdentifier } from 'src/shared/domain/value-objects';
import { MakerDomainException, MakerExceptionMessage } from '../exceptions';

export class MakerIdentifier extends EntityIdentifier<string> {
  private constructor(id: string) {
    super(id);
    this.validate();
  }

  public get value(): string {
    return this._value;
  }

  public static fromString(id: string): MakerIdentifier {
    return new MakerIdentifier(id);
  }

  public static create(id: string): MakerIdentifier {
    return new MakerIdentifier(id);
  }

  public equals(other: MakerIdentifier): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return String(this._value);
  }

  private validate(): void {
    if (!this._value) {
      throw new MakerDomainException(MakerExceptionMessage.fieldIdRequired);
    }
    if (this._value.trim() === '') {
      throw new MakerDomainException(MakerExceptionMessage.fieldIdEmpty);
    }
    // Add more domain-specific validation here if needed
  }
}
