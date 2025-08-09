/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ICommand } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';

/**
 * Command for scheduling an existing message for delivery via BullMQ
 * This is used when processing EventStore events to avoid creating new message aggregates
 */
export interface ScheduleExistingMessageQueueProps {
  messageId: string; // Existing message ID from EventStore
  tenant: string;
  configCode: string;
  channel: string;
  renderedMessage: string;
  scheduledAt?: Date;
  correlationId: string;
  priority?: number;
}

export class ScheduleExistingMessageQueueCommand implements ICommand {
  constructor(
    public user: IUserToken,
    public readonly props: ScheduleExistingMessageQueueProps,
  ) {}
}
