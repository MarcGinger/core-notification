/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export interface ILogger {
  debug(context: Record<string, unknown>, message: string): void;
  log(context: Record<string, unknown>, message: string): void;
  error(
    context: Record<string, unknown>,
    message: string,
    trace?: string,
  ): void;
  warn(context: Record<string, unknown>, message: string): void;
  verbose(context: Record<string, unknown>, message: string): void;
}
