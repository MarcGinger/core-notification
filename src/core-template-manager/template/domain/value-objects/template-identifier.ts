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
 * Value object for Template identifiers.
 * Extends EntityIdentifier for domain-specific constraints.
 * Implements immutable value object pattern with validation.
 */

import { EntityIdentifier } from 'src/shared/domain/value-objects';
import {
  TemplateDomainException,
  TemplateExceptionMessage,
} from '../exceptions';

export class TemplateIdentifier extends EntityIdentifier<string> {
  private constructor(code: string) {
    super(code);
    this.validate();
  }

  public get value(): string {
    return this._value;
  }

  public static fromString(code: string): TemplateIdentifier {
    return new TemplateIdentifier(code);
  }

  public static create(code: string): TemplateIdentifier {
    return new TemplateIdentifier(code);
  }

  public equals(other: TemplateIdentifier): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return String(this._value);
  }

  private validate(): void {
    if (!this._value) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldCodeRequired,
      );
    }
    if (this._value.trim() === '') {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldCodeEmpty,
      );
    }
    // Add more domain-specific validation here if needed
  }
}
