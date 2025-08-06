/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Body, Controller, HttpCode, Post, SetMetadata } from '@nestjs/common';
import {
  ApiOperation,
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
import { MessageApplicationService } from '../../application/services';
import { MessageCreateRequest, MessageResponse } from '../../application/dtos';
import { MessagePermissions } from '../../domain/permissions';

@Controller({
  version: '1',
})
@ApiTags('Messages')
export class MessageController {
  constructor(
    private readonly messageApplicationService: MessageApplicationService,
  ) {}

  @Post()
  @SetMetadata('permissions', [MessagePermissions.Create])
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new message',
    description:
      'Creates a new message with the provided configuration and returns the created resource.',
  })
  @ApiSecurity('opa_managed')
  @ApiResponse({
    status: 201,
    type: MessageResponse,
    ...staticResponse,
    headers: {
      ...staticResponse.headers,
      Location: {
        description: 'URI of the newly created resource',
        schema: { type: 'string', example: '/messages/the-key' },
      },
    },
  })
  @ApiCommonErrors()
  async create(
    @KeycloakUser() user: IUserToken,
    @Body() createRequest: MessageCreateRequest,
  ): Promise<MessageResponse> {
    return this.messageApplicationService.create(user, createRequest);
  }
}
