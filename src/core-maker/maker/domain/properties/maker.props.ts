/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { MakerStatusEnum } from '../entities';
import { MakerIdentifier } from '../value-objects';

// generate-domain-properties
export interface MakerProps {
  readonly id: MakerIdentifier;
  readonly from: string;
  readonly to: string;
  readonly description?: string;
  readonly status: MakerStatusEnum;
  readonly scheduledAt?: Date;
  readonly correlationId?: string;
}
