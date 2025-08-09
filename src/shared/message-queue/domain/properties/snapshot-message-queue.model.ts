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

export interface SnapshotMessageQueueProps {
  readonly id: string;
  readonly payload?: Record<string, any>;
  readonly status: MessageQueueStatusEnum;
  readonly scheduledAt?: Date;
  readonly sentAt?: Date;
  readonly failureReason?: string;
  readonly correlationId?: string;
  readonly priority?: number;
  readonly retryCount: number;
}
