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
import { KeycloakUser, Public } from 'nest-keycloak-connect';
import { IUserToken } from 'src/shared/auth';
import {
  ApiCommonErrors,
  staticResponse,
} from 'src/shared/infrastructure/controllers';
import {
  TransactionCreateRequest,
  TransactionResponse,
} from '../../application/dtos';
import { TransactionApplicationService } from '../../application/services';
import { TransactionPermissions } from '../../domain/permissions';

@Controller({
  version: '1',
})
@Public()
@ApiTags('Transactions')
export class TransactionController {
  constructor(
    private readonly transactionApplicationService: TransactionApplicationService,
  ) {}

  @Post()
  @SetMetadata('permissions', [TransactionPermissions.Create])
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new transaction',
    description:
      'Creates a new transaction with the provided configuration and returns the created resource.',
  })
  @ApiSecurity('opa_managed')
  @ApiResponse({
    status: 201,
    type: TransactionResponse,
    ...staticResponse,
    headers: {
      ...staticResponse.headers,
      Location: {
        description: 'URI of the newly created resource',
        schema: { type: 'string', example: '/transactions/the-key' },
      },
    },
  })
  @ApiCommonErrors()
  async create(
    @KeycloakUser() user: IUserToken,
    @Body() createRequest: TransactionCreateRequest,
  ): Promise<TransactionResponse> {
    const mockUser: IUserToken = {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      tenant: 'xxx', // This should come from the actual JWT
    };

    return this.transactionApplicationService.create(mockUser, createRequest);
  }
}
