/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

/**
 * Command for queueing slack messages for background processing
 */
export interface QueueSlackMessageProps {
  tenant: string;
  configCode: string;
  channel: string;
  templateCode?: string;
  payload?: Record<string, any>;
  renderedMessage: string;
  scheduledAt?: Date;
  correlationId: string;
  priority?: number;
}

export class QueueSlackMessageCommand {
  constructor(public readonly props: QueueSlackMessageProps) {}
}
