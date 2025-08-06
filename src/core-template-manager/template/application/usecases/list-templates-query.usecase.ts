/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import {
  ListTemplatePropsOptions,
  TemplatePage,
} from '../../domain/properties';
import { TemplateRepository } from '../../infrastructure/repositories';

/**
 * Query Use Case for listing templates with pagination and filtering
 * Follows Clean Architecture principles by encapsulating query business logic
 */
@Injectable()
export class ListTemplatesQueryUseCase {
  constructor(private readonly repository: TemplateRepository) {}

  async execute(
    user: IUserToken,
    options: ListTemplatePropsOptions,
  ): Promise<TemplatePage> {
    // Apply any query-specific business rules, filtering, or validation here
    // This layer allows for future enhancements like:
    // - Additional filtering logic
    // - Caching strategies
    // - Data transformation
    // - Access control beyond repository level
    return await this.repository.list(user, options);
  }
}
