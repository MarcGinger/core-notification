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
 * Symbol-based DI tokens for message queue infrastructure
 * Prevents naming collisions and provides type safety
 */
export const QUEUE_TOKENS = {
  GENERIC_QUEUE: Symbol('IGenericQueue'),
  QUEUE_REGISTRY: Symbol('QUEUE_REGISTRY'),
  QUEUE_CONFIG: Symbol('QUEUE_CONFIG'),
} as const;

export type QueueTokens = typeof QUEUE_TOKENS;
