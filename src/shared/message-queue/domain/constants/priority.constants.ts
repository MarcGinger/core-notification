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
 * Priority Constants for Message Queue Jobs
 *
 * ⚠️ BullMQ Priority Semantics: LOWER numbers = HIGHER priority
 *
 * This is important to remember when setting job priorities in BullMQ.
 * Jobs with priority 1 will be processed before jobs with priority 10.
 */
export const PRIORITY_LEVELS = {
  CRITICAL: 1, // System alerts, failures - highest priority
  HIGH: 3, // User notifications, time-sensitive operations
  NORMAL: 5, // Standard business operations
  LOW: 7, // Background processing, cleanup
  BULK: 10, // Bulk operations, large data processing - lowest priority
} as const;

export type PriorityLevel =
  (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];
