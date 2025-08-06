/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IMessage } from '../entities';
import { MessageDomainException, MessageExceptionMessage } from '../exceptions';

export function messageEquals(
  a: IMessage | undefined,
  b: IMessage | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.configCode === b.configCode &&
    a.channel === b.channel &&
    a.templateCode === b.templateCode &&
    a.renderedMessage === b.renderedMessage &&
    a.status === b.status &&
    (a.scheduledAt === b.scheduledAt ||
      (a.scheduledAt instanceof Date &&
        b.scheduledAt instanceof Date &&
        a.scheduledAt.getTime() === b.scheduledAt.getTime())) &&
    (a.sentAt === b.sentAt ||
      (a.sentAt instanceof Date &&
        b.sentAt instanceof Date &&
        a.sentAt.getTime() === b.sentAt.getTime())) &&
    a.failureReason === b.failureReason &&
    a.correlationId === b.correlationId &&
    a.retryCount === b.retryCount &&
    (a.createdAt === b.createdAt ||
      (a.createdAt instanceof Date &&
        b.createdAt instanceof Date &&
        a.createdAt.getTime() === b.createdAt.getTime())) &&
    (a.updatedAt === b.updatedAt ||
      (a.updatedAt instanceof Date &&
        b.updatedAt instanceof Date &&
        a.updatedAt.getTime() === b.updatedAt.getTime()))
  );
}

export function validateMessage(input: IMessage | string): IMessage {
  let obj: IMessage;
  if (typeof input === 'string') {
    obj = { id: input } as IMessage;
  } else {
    obj = { ...input };
  }
  if (obj.configCode === undefined || obj.configCode === null) {
    throw new MessageDomainException(
      MessageExceptionMessage.requiredConfigCode,
    );
  }
  if (obj.channel === undefined || obj.channel === null) {
    throw new MessageDomainException(MessageExceptionMessage.requiredChannel);
  }
  if (obj.status === undefined || obj.status === null) {
    throw new MessageDomainException(MessageExceptionMessage.requiredStatus);
  }
  if (obj.retryCount === undefined || obj.retryCount === null) {
    throw new MessageDomainException(
      MessageExceptionMessage.requiredRetryCount,
    );
  }
  if (obj.createdAt === undefined || obj.createdAt === null) {
    throw new MessageDomainException(MessageExceptionMessage.requiredCreatedAt);
  }
  if (obj.updatedAt === undefined || obj.updatedAt === null) {
    throw new MessageDomainException(MessageExceptionMessage.requiredUpdatedAt);
  }
  if (Array.isArray(obj.retryCount) && obj.retryCount.length === 0) {
    throw new MessageDomainException(
      MessageExceptionMessage.emptyRetryCountArray,
    );
  }
  // No relationships to normalize, return input as is
  return obj;
}

export function toMessage(input: IMessage | string): IMessage {
  if (typeof input === 'string') {
    throw new MessageDomainException(
      MessageExceptionMessage.invalidInputTypeForConversion,
    );
  }
  const Message = { ...input };
  validateMessage(Message);
  return Message;
}
