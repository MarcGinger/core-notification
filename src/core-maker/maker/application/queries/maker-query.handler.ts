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
import { MakerPage } from '../../domain/properties';
import { ListMakerQuery } from './maker-query.class';
import { MakerRepository } from '../../infrastructure/repositories';
// generate-queries
@QueryHandler(ListMakerQuery)
export class MakerListHandler implements IQueryHandler<ListMakerQuery> {
  constructor(private readonly repository: MakerRepository) {}

  async execute(query: ListMakerQuery): Promise<MakerPage> {
    return await this.repository.list(query.user, query.options);
  }
}
