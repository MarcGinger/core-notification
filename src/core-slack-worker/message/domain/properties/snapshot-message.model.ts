/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { MessageStatusEnum } from '../entities';

export interface SnapshotMessageProps {
  readonly id: string;
  readonly configCode: string;
  readonly channel: string;
  readonly templateCode?: string;
  readonly payload?: Record<string, any>;
  readonly renderedMessage?: string;
  readonly status: MessageStatusEnum;
  readonly scheduledAt?: Date;
  readonly sentAt?: Date;
  readonly failureReason?: string;
  readonly correlationId?: string;
  readonly priority?: number;
  readonly retryCount: number;
}
