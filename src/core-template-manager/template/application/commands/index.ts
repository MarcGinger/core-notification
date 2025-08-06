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
import { CreateTemplateHandler } from './create/create-template.handler';
import { UpdateTemplateHandler } from './update/update-template.handler';

// application/commands/index.ts
export const TemplateCommands = [CreateTemplateHandler, UpdateTemplateHandler];

export * from './create/create-template.command';
export * from './update/update-template.command';
