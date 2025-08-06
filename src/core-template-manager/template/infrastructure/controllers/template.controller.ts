/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { KeycloakUser } from 'nest-keycloak-connect';
import { IUserToken } from 'src/shared/auth';
import {
  ApiCommonErrors,
  staticResponse,
} from 'src/shared/infrastructure/controllers';
import {
  TemplateCreateRequest,
  TemplateListRequest,
  TemplatePageResponse,
  TemplateResponse,
  TemplateUpdateRequest,
} from '../../application/dtos';
import { TemplateApplicationService } from '../../application/services';
import { TemplatePermissions } from '../../domain/permissions';

@Controller({
  version: '1',
})
@ApiTags('Templates')
export class TemplateController {
  constructor(
    private readonly templateApplicationService: TemplateApplicationService,
  ) {}

  @Get()
  @SetMetadata('permissions', [TemplatePermissions.Read])
  @ApiResponse({ type: TemplatePageResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiOperation({
    summary: 'List all templates',
    description:
      'Retrieves a paginated list of templates with optional filtering and sorting.',
  })
  @ApiCommonErrors()
  async list(
    @KeycloakUser() user: IUserToken,
    @Query() pageRequest?: TemplateListRequest,
  ): Promise<TemplatePageResponse> {
    return await this.templateApplicationService.list(user, pageRequest);
  }

  @Get(':code')
  @SetMetadata('permissions', [TemplatePermissions.Read])
  @ApiResponse({ type: TemplateResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiOperation({
    summary: 'Get template by key',
    description:
      'Retrieves detailed information about a specific template by its unique key(s).',
  })
  @ApiParam({
    name: 'code',
    description: 'The unique identifier (code) of the template',
    type: String,
  })
  @ApiCommonErrors()
  async get(
    @KeycloakUser() user: IUserToken,
    @Param('code') code: string,
  ): Promise<TemplateResponse> {
    return this.templateApplicationService.get(user, code);
  }

  @Get(':code/content')
  @SetMetadata('permissions', [TemplatePermissions.Read])
  @ApiResponse({ type: TemplateResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiOperation({
    summary: 'Get template content by key',
    description:
      'Retrieves detailed information about a specific template by its unique key(s).',
  })
  @ApiParam({
    name: 'code',
    description: 'The unique identifier (code) of the template',
    type: String,
  })
  @ApiCommonErrors()
  async getContent(
    @KeycloakUser() user: IUserToken,
    @Param('code') code: string,
  ): Promise<TemplateResponse> {
    return this.templateApplicationService.getContent(user, code);
  }

  @Post()
  @SetMetadata('permissions', [TemplatePermissions.Create])
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new template',
    description:
      'Creates a new template with the provided configuration and returns the created resource.',
  })
  @ApiSecurity('opa_managed')
  @ApiResponse({
    status: 201,
    type: TemplateResponse,
    ...staticResponse,
    headers: {
      ...staticResponse.headers,
      Location: {
        description: 'URI of the newly created resource',
        schema: { type: 'string', example: '/templates/the-key' },
      },
    },
  })
  @ApiCommonErrors()
  async create(
    @KeycloakUser() user: IUserToken,
    @Body() createRequest: TemplateCreateRequest,
  ): Promise<TemplateResponse> {
    return this.templateApplicationService.create(user, createRequest);
  }

  @Put(':code')
  @SetMetadata('permissions', [TemplatePermissions.Update])
  @ApiResponse({ type: TemplateResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiOperation({
    summary: 'Update a template',
    description:
      'Updates an existing template with the provided changes and returns the updated resource.',
  })
  @ApiParam({
    name: 'code',
    description: 'The unique identifier (code) of the template',
    type: String,
  })
  @ApiCommonErrors()
  async update(
    @KeycloakUser() user: IUserToken,
    @Param('code') code: string,
    @Body() updateRequest: TemplateUpdateRequest,
  ): Promise<TemplateResponse> {
    return this.templateApplicationService.update(user, code, updateRequest);
  }
}
