/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export enum MessageQueueStatusEnum {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
  RETRYING = 'retrying',
}

export interface IMessageQueue {
  readonly id: string;
  readonly status: MessageQueueStatusEnum;
  readonly payload?: Record<string, any>;
  readonly priority?: number;
  readonly scheduledAt?: Date;
  readonly sentAt?: Date;
  readonly failureReason?: string;
  readonly correlationId?: string;
  readonly retryCount: number;
}
