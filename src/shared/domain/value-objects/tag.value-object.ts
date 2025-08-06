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
 * Tag Value Object
 * Represents a tag for domain entities (immutable, value-based equality)
 */
export class Tag {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value.trim();
    this.validate();
  }

  public static create(value: string): Tag {
    return new Tag(value);
  }

  private validate(): void {
    if (!this.value || this.value.length === 0) {
      throw new Error('Tag cannot be empty');
    }
    if (this.value.length > 32) {
      throw new Error('Tag must be at most 32 characters');
    }
    // Add more rules as needed
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Tag): boolean {
    return this.value === other.value;
  }
}
