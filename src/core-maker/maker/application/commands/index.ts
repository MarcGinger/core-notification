/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

// generate-commands
import { CreateMakerHandler } from './create/create-maker.handler';
import { UpdateMakerHandler } from './update/update-maker.handler';
import { UpdateMakerStatusHandler } from './update-status/update-maker-status.handler';

// application/commands/index.ts
export const MakerCommands = [
  CreateMakerHandler,
  UpdateMakerHandler,
  UpdateMakerStatusHandler,
];

export * from './create/create-maker.command';
export * from './update/update-maker.command';
export * from './update-status/update-maker-status.command';
