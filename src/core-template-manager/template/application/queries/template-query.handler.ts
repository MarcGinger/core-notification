/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TemplatePage } from '../../domain/properties';
import {
  GetTemplateContentQueryUseCase,
  GetTemplateQueryUseCase,
  ListTemplatesQueryUseCase,
} from '../usecases';
import {
  ContentTemplateQuery,
  ItemTemplateQuery,
  ListTemplateQuery,
} from './template-query.class';

// generate-queries
@QueryHandler(ItemTemplateQuery)
export class TemplateItemHandler implements IQueryHandler<ItemTemplateQuery> {
  constructor(private readonly useCase: GetTemplateQueryUseCase) {}

  async execute(query: ItemTemplateQuery) {
    return await this.useCase.execute(query.user, query.code);
  }
}

@QueryHandler(ListTemplateQuery)
export class TemplateListHandler implements IQueryHandler<ListTemplateQuery> {
  constructor(private readonly useCase: ListTemplatesQueryUseCase) {}

  async execute(query: ListTemplateQuery): Promise<TemplatePage> {
    return await this.useCase.execute(query.user, query.options);
  }
}

@QueryHandler(ContentTemplateQuery)
export class TemplateContentHandler
  implements IQueryHandler<ContentTemplateQuery>
{
  constructor(private readonly useCase: GetTemplateContentQueryUseCase) {}

  async execute(query: ContentTemplateQuery) {
    return this.useCase.execute(query.user, query.code);
  }
}
