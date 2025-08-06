/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateTemplateUseCase } from './create-template.usecase';
import { GetTemplateContentQueryUseCase } from './get-template-content-query.usecase';
import { GetTemplateQueryUseCase } from './get-template-query.usecase';
import { ListTemplatesQueryUseCase } from './list-templates-query.usecase';
import { UpdateTemplateUseCase } from './update-template.usecase';

// application/commands/index.ts
export const TemplateUseCases = [
  CreateTemplateUseCase,
  UpdateTemplateUseCase,
  GetTemplateQueryUseCase,
  ListTemplatesQueryUseCase,
  GetTemplateContentQueryUseCase,
];

export {
  CreateTemplateUseCase,
  GetTemplateContentQueryUseCase,
  GetTemplateQueryUseCase,
  ListTemplatesQueryUseCase,
  UpdateTemplateUseCase,
};
