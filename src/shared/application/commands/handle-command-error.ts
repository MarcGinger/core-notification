/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';

export function handleCommandError(
  error: unknown,
  notFoundMessage: any,
  badRequestMessage: any,
) {
  if (error instanceof NotFoundException) {
    throw error;
  }
  if (error instanceof BadRequestException) {
    throw error;
  }
  throw error;
  // throw new BadRequestException(
  //   badRequestMessage,
  //   error instanceof Error ? error.message : String(error),
  // );
}
