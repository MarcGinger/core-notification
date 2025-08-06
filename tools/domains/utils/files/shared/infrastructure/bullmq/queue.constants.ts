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
 * BullMQ Queue Names
 * Centralized constants for queue names to ensure consistency across the application
 */
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  DATA_PROCESSING: 'data-processing',
  SLACK_MESSAGE: 'slack-message',
} as const;

/**
 * Queue Name Type
 * Type definition for queue names
 */
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Queue Priorities
 * Define priority levels for different queue types
 */
export const QUEUE_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20,
} as const;

/**
 * Job Options Templates
 * Predefined job option templates for different use cases
 */
export const JOB_OPTIONS_TEMPLATES = {
  IMMEDIATE: {
    delay: 0,
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  SCHEDULED: {
    attempts: 5,
    removeOnComplete: 200,
    removeOnFail: 100,
  },
  CRITICAL: {
    attempts: 10,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 25,
  },
} as const;
