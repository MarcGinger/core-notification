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
import { ITemplate } from '../../domain/entities';
import { TemplateRepository } from '../../infrastructure/repositories';

/**
 * Query Use Case for retrieving a single template by code
 * Follows Clean Architecture principles by encapsulating query business logic
 */
@Injectable()
export class GetTemplateQueryUseCase {
  constructor(private readonly repository: TemplateRepository) {}

  async execute(user: IUserToken, code: string): Promise<ITemplate> {
    // Apply any query-specific business rules or validation here
    // For now, delegating directly to repository but this layer allows
    // for future business logic, caching, transformation, etc.
    return await this.repository.getTemplate(user, code);
  }
}
