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
  CreateMakerProps,
  ListMakerPropsOptions,
  MakerPage,
  UpdateMakerProps,
} from '../../domain/properties';
import { ListMakerQuery } from '../../application/queries';
import {
  CreateMakerCommand,
  UpdateMakerCommand,
  UpdateMakerStatusCommand,
} from '../../application/commands';
import { IMaker, MakerStatusEnum } from '../../domain/entities';

// generate-api-service

@Injectable()
export class MakerApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async list(
    user: IUserToken,
    pageOptions?: ListMakerPropsOptions,
  ): Promise<MakerPage> {
    const options: ListMakerPropsOptions = pageOptions || {};
    return await this.queryBus.execute<ListMakerQuery, MakerPage>(
      new ListMakerQuery(user, options),
    );
  }

  async create(user: IUserToken, dto: CreateMakerProps): Promise<IMaker> {
    const entity = await this.commandBus.execute<CreateMakerCommand, IMaker>(
      new CreateMakerCommand(user, dto),
    );
    return entity;
  }
  async update(
    user: IUserToken,
    id: string,
    dto: UpdateMakerProps,
  ): Promise<IMaker> {
    const entity = await this.commandBus.execute<UpdateMakerCommand, IMaker>(
      new UpdateMakerCommand(user, id, dto),
    );
    return entity;
  }

  async updateStatus(
    user: IUserToken,
    id: string,
    status: MakerStatusEnum,
  ): Promise<IMaker> {
    const entity = await this.commandBus.execute<
      UpdateMakerStatusCommand,
      IMaker
    >(new UpdateMakerStatusCommand(user, id, status));
    return entity;
  }
}
