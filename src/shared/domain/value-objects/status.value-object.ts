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
 * Status Value Object
 * Represents the status of a domain entity (immutable, value-based equality)
 */
export class Status {
  private readonly value: string;

  private static readonly allowed = [
    'active',
    'inactive',
    'pending',
    'disabled',
    // Add more statuses as needed
  ];

  private constructor(value: string) {
    this.value = value;
    this.validate();
  }

  public static create(value: string): Status {
    return new Status(value);
  }

  private validate(): void {
    if (!Status.allowed.includes(this.value)) {
      throw new Error(`Invalid status: ${this.value}`);
    }
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Status): boolean {
    return this.value === other.value;
  }
}
