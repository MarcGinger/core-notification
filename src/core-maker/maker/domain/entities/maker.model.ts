/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export enum MakerStatusEnum {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
  RETRYING = 'retrying',
}

export interface IMaker {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly description?: string;
  readonly status: MakerStatusEnum;
  readonly scheduledAt?: Date;
  readonly correlationId?: string;
}
