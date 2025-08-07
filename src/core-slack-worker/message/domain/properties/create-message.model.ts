/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export interface CreateMessageProps {
  readonly channel: string;
  readonly configCode: string;
  readonly templateCode?: string;
  readonly payload?: Record<string, any>;
  readonly scheduledAt?: Date;
  readonly priority?: number;
  readonly correlationId?: string;
}
