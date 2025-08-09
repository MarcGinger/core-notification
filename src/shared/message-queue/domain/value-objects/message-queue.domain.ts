/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IMessageQueue } from '../entities';
import {
  MessageQueueDomainException,
  MessageQueueExceptionMessageQueue,
} from '../exceptions';

export function messageEquals(
  a: IMessageQueue | undefined,
  b: IMessageQueue | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.priority === b.priority &&
    a.scheduledAt?.getTime() === b.scheduledAt?.getTime() &&
    a.sentAt?.getTime() === b.sentAt?.getTime() &&
    a.failureReason === b.failureReason &&
    a.correlationId === b.correlationId &&
    a.retryCount === b.retryCount
  );
}

export function validateMessageQueue(
  input: IMessageQueue | string,
): IMessageQueue {
  let obj: IMessageQueue;
  if (typeof input === 'string') {
    obj = { id: input } as IMessageQueue;
  } else {
    obj = { ...input };
  }
  if (obj.status === undefined || obj.status === null) {
    throw new MessageQueueDomainException(
      MessageQueueExceptionMessageQueue.requiredStatus,
    );
  }
  if (obj.retryCount === undefined || obj.retryCount === null) {
    throw new MessageQueueDomainException(
      MessageQueueExceptionMessageQueue.requiredRetryCount,
    );
  }
  if (Array.isArray(obj.retryCount) && obj.retryCount.length === 0) {
    throw new MessageQueueDomainException(
      MessageQueueExceptionMessageQueue.emptyRetryCountArray,
    );
  }
  // No relationships to normalize, return input as is
  return obj;
}

export function toMessageQueue(input: IMessageQueue | string): IMessageQueue {
  if (typeof input === 'string') {
    throw new MessageQueueDomainException(
      MessageQueueExceptionMessageQueue.invalidInputTypeForConversion,
    );
  }
  const MessageQueue = { ...input };
  validateMessageQueue(MessageQueue);
  return MessageQueue;
}
