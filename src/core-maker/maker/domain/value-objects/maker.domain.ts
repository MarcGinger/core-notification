/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IMaker } from '../entities';
import { MakerDomainException, MakerExceptionMessage } from '../exceptions';

export function makerEquals(
  a: IMaker | undefined,
  b: IMaker | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.description === b.description &&
    a.status === b.status &&
    (a.scheduledAt === b.scheduledAt ||
      (a.scheduledAt instanceof Date &&
        b.scheduledAt instanceof Date &&
        a.scheduledAt.getTime() === b.scheduledAt.getTime())) &&
    a.correlationId === b.correlationId
  );
}

export function validateMaker(input: IMaker | string): IMaker {
  let obj: IMaker;
  if (typeof input === 'string') {
    obj = { id: input } as IMaker;
  } else {
    obj = { ...input };
  }
  if (obj.from === undefined || obj.from === null) {
    throw new MakerDomainException(MakerExceptionMessage.requiredFrom);
  }
  if (obj.to === undefined || obj.to === null) {
    throw new MakerDomainException(MakerExceptionMessage.requiredTo);
  }
  if (obj.status === undefined || obj.status === null) {
    throw new MakerDomainException(MakerExceptionMessage.requiredStatus);
  }
  // No relationships to normalize, return input as is
  return obj;
}

export function toMaker(input: IMaker | string): IMaker {
  if (typeof input === 'string') {
    throw new MakerDomainException(
      MakerExceptionMessage.invalidInputTypeForConversion,
    );
  }
  const Maker = { ...input };
  validateMaker(Maker);
  return Maker;
}
