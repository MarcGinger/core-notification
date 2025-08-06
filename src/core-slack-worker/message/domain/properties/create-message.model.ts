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
  readonly configCode: string;
  readonly channel: string;
  readonly templateCode?: string;
  readonly payload?: Record<string, any>;
  readonly renderedMessage?: string;
  readonly scheduledAt?: Date;
  readonly correlationId?: string;
}
