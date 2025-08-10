/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

// Generic Command Handlers
import {
  MoveToDelayedHandler,
  RetryJobHandler,
  ScheduleJobHandler,
} from './queue-job.handler';

// All Generic Message Queue Command Handlers
export const GenericMessageQueueCommands = [
  ScheduleJobHandler,
  RetryJobHandler,
  MoveToDelayedHandler,
];

// Export Commands
export * from './queue-job.command';

// Export Handlers
export * from './queue-job.handler';
