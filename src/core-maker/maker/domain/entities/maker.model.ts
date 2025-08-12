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
  /** Transaction has been created but not yet queued for processing */
  CREATED = 'CREATED',

  /** Transaction has been queued for processing */
  PENDING = 'PENDING',

  /** Transaction is currently being processed */
  PROCESSING = 'PROCESSING',

  /** Transaction has been successfully completed */
  SUCCESS = 'SUCCESS',

  /** Transaction has failed and will not be retried */
  FAILED = 'FAILED',

  /** Transaction has failed but is scheduled for retry */
  RETRYING = 'RETRYING',

  /** Transaction is scheduled for future processing */
  SCHEDULED = 'SCHEDULED',

  /** Transaction has been cancelled by user */
  CANCELLED = 'CANCELLED',
}

export interface IMaker {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly description?: string;
  readonly amount: Date;
  readonly status?: MakerStatusEnum;
  readonly scheduledAt?: Date;
  readonly correlationId?: string;
}
