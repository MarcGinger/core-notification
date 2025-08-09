/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { MessageQueueStatusEnum } from '../entities';
import { MessageQueueIdentifier } from '../value-objects';
import { ScheduledAt } from '../value-objects/scheduled-at';

// generate-domain-properties
export interface MessageQueueProps {
  readonly id: MessageQueueIdentifier;
  readonly payload?: Record<string, any>;
  readonly status: MessageQueueStatusEnum;
  readonly priority?: number;
  readonly scheduledAt?: ScheduledAt;
  readonly sentAt?: Date;
  readonly failureReason?: string;
  readonly correlationId?: string;
  readonly retryCount: number;
}
