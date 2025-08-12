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
  Patch,
  Post,
  Put,
  Query,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { KeycloakUser, Public } from 'nest-keycloak-connect';
import { IUserToken } from 'src/shared/auth';
import {
  ApiCommonErrors,
  staticResponse,
} from 'src/shared/infrastructure/controllers';
import {
  MakerCreateRequest,
  MakerListRequest,
  MakerPageResponse,
  MakerResponse,
  MakerStatusUpdateRequest,
  MakerUpdateRequest,
} from '../../application/dtos';
import { MakerApplicationService } from '../../application/services';
import { PublishMakerEventUseCase } from '../../application/usecases/publish-maker-event.usecase';
import { MakerPermissions } from '../../domain/permissions';

@Controller({
  version: '1',
})
@Public()
@ApiTags('Makers')
export class MakerController {
  constructor(
    private readonly makerApplicationService: MakerApplicationService,
    private readonly publishMakerEventUseCase: PublishMakerEventUseCase,
  ) {}

  @Post('publish')
  async publishEvent(
    @Body() body: { makerId: string; payload: Record<string, any> },
  ) {
    await this.publishMakerEventUseCase.execute(body.makerId, body.payload);
    return { status: 'published', makerId: body.makerId };
  }

  @Get()
  @SetMetadata('permissions', [MakerPermissions.Read])
  @ApiResponse({ type: MakerPageResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiOperation({
    summary: 'List all makers',
    description:
      'Retrieves a paginated list of makers with optional filtering and sorting.',
  })
  @ApiCommonErrors()
  async list(
    @KeycloakUser() user: IUserToken,
    @Query() pageRequest?: MakerListRequest,
  ): Promise<MakerPageResponse> {
    return await this.makerApplicationService.list(user, pageRequest);
  }

  @Post()
  @SetMetadata('permissions', [MakerPermissions.Create])
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new maker',
    description:
      'Creates a new maker with the provided configuration and returns the created resource.',
  })
  @ApiSecurity('opa_managed')
  @ApiResponse({
    status: 201,
    type: MakerResponse,
    ...staticResponse,
    headers: {
      ...staticResponse.headers,
      Location: {
        description: 'URI of the newly created resource',
        schema: { type: 'string', example: '/makers/the-key' },
      },
    },
  })
  @ApiCommonErrors()
  async create(
    @KeycloakUser() user: IUserToken,
    @Body() createRequest: MakerCreateRequest,
  ): Promise<MakerResponse> {
    const mockUser: IUserToken = {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      tenant: 'xxx', // This should come from the actual JWT
    };

    return this.makerApplicationService.create(mockUser, createRequest);
  }

  @Put(':id')
  @SetMetadata('permissions', [MakerPermissions.Update])
  @ApiResponse({ type: MakerResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiOperation({
    summary: 'Update a maker',
    description:
      'Updates an existing maker with the provided changes and returns the updated resource.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier (id) of the maker',
    type: String,
  })
  @ApiCommonErrors()
  async update(
    @KeycloakUser() user: IUserToken,
    @Param('id') id: string,
    @Body() updateRequest: MakerUpdateRequest,
  ): Promise<MakerResponse> {
    return this.makerApplicationService.update(user, id, updateRequest);
  }

  @Patch(':id/status')
  @SetMetadata('permissions', [MakerPermissions.UpdateStatus])
  @ApiOperation({
    summary: 'Update maker status',
    description: 'Updates the status of a maker.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier (id) of the maker',
    type: String,
  })
  @ApiBody({
    type: MakerStatusUpdateRequest,
    description: 'Status update payload',
  })
  @ApiResponse({ type: MakerResponse, ...staticResponse })
  @ApiSecurity('opa_managed')
  @ApiCommonErrors()
  async updateStatus(
    @KeycloakUser() user: IUserToken,
    @Param('id') id: string,
    @Body() body: MakerStatusUpdateRequest,
  ): Promise<MakerResponse> {
    return this.makerApplicationService.updateStatus(user, id, body.status);
  }
}
