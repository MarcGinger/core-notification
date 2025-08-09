/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUserToken } from 'src/shared/auth';
import { InfrastructureRepository } from 'src/shared/infrastructure/repositories';
import { ILogger } from 'src/shared/logger';
import {
  ITemplate,
  SnapshotTemplateProps,
  TemplateExceptionMessage,
} from '../../../../core-template-manager/template/domain';
import { RedisUtilityService } from '../../../infrastructure/redis';

const COMPONENT_NAME = 'TemplateRepository';

export class TemplateRepository extends InfrastructureRepository<
  typeof TemplateExceptionMessage
> {
  systemUser = {
    sub: 'system-template-projection',
    preferred_username: 'system',
    name: 'System Template Projection',
    email: 'system@internal',
    tenant: 'system',
    roles: ['system'],
  } as IUserToken;

  private readonly redisProjectionKey = 'template-projection';

  constructor(
    protected readonly configService: ConfigService,
    @Inject('ILogger') protected readonly logger: ILogger,
    private readonly redisUtilityService: RedisUtilityService,
  ) {
    super(configService, logger, TemplateExceptionMessage);
  }

  /**
   * Get a single template by tenant and code from Redis
   * Used for individual template lookups with optimal performance
   */
  async get(
    user: IUserToken,
    code: string,
  ): Promise<SnapshotTemplateProps | null> {
    try {
      // Read the template data directly - getOne returns undefined if not found
      const template =
        await this.redisUtilityService.getOne<SnapshotTemplateProps>(
          user,
          this.redisProjectionKey,
          code,
        );

      if (!template) {
        this.logger.debug(
          { user, code },
          'Template not found in Redis projection',
        );
        return null;
      }

      this.logger.debug(
        { user, code },
        'Successfully retrieved template from Redis projection',
      );

      return template;
    } catch (error) {
      this.logger.error(
        {
          user,
          code,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to get template by code from Redis projection',
      );
      return null;
    }
  }

  async getTemplate(user: IUserToken, code: string): Promise<ITemplate> {
    const result = await this.get(user, code);
    if (!result) {
      throw new Error(`Template not found: ${code}`);
    }
    return result;
  }
}
