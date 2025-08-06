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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import {
  CreateTemplateCommand,
  UpdateTemplateCommand,
} from '../../application/commands';
import { ITemplate } from '../../domain/entities';
import {
  CreateTemplateProps,
  ListTemplatePropsOptions,
  TemplatePage,
  UpdateTemplateProps,
} from '../../domain/properties';
import {
  ContentTemplateQuery,
  ItemTemplateQuery,
  ListTemplateQuery,
} from '../queries/template-query.class';

// generate-api-service

@Injectable()
export class TemplateApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async list(
    user: IUserToken,
    pageOptions?: ListTemplatePropsOptions,
  ): Promise<TemplatePage> {
    const options: ListTemplatePropsOptions = pageOptions || {};
    return await this.queryBus.execute<ListTemplateQuery, TemplatePage>(
      new ListTemplateQuery(user, options),
    );
  }

  async get(user: IUserToken, code: string): Promise<ITemplate> {
    return this.queryBus.execute(new ItemTemplateQuery(user, code));
  }

  async getContent(user: IUserToken, code: string): Promise<ITemplate> {
    return this.queryBus.execute(new ContentTemplateQuery(user, code));
  }
  async create(user: IUserToken, dto: CreateTemplateProps): Promise<ITemplate> {
    const entity = await this.commandBus.execute<
      CreateTemplateCommand,
      ITemplate
    >(new CreateTemplateCommand(user, dto));
    return entity;
  }
  async update(
    user: IUserToken,
    code: string,
    dto: UpdateTemplateProps,
  ): Promise<ITemplate> {
    const entity = await this.commandBus.execute<
      UpdateTemplateCommand,
      ITemplate
    >(new UpdateTemplateCommand(user, code, dto));
    return entity;
  }
}
