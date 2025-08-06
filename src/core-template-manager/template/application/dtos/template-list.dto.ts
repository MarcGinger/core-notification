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
  ListMetaResponse,
  ListOptionResponse,
} from 'src/shared/application/dtos';
import {
  ListTemplateOrderEnum,
  ListTemplateProps,
  ListTemplatePropsOptions,
} from '../../domain/properties';
import {
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../../domain/entities';
import {
  ApiTemplateActive,
  ApiTemplateCode,
  ApiTemplateContent,
  ApiTemplateContentUrl,
  ApiTemplateDescription,
  ApiTemplateList,
  ApiTemplateListMeta,
  ApiTemplateListOrderBy,
  ApiTemplateName,
  ApiTemplatePayloadSchema,
  ApiTemplateTransport,
  ApiTemplateUseCase,
  ApiTemplateVersion,
} from './decorators';

/**
 * Template list response DTO
 */
export class TemplateListResponse implements ListTemplateProps {
  @ApiTemplateCode({ required: true })
  readonly code: string;

  @ApiTemplateName({ required: true })
  readonly name: string;

  @ApiTemplateDescription()
  readonly description?: string;

  @ApiTemplateTransport({ required: true })
  readonly transport: TemplateTransportEnum;

  @ApiTemplateUseCase({ required: true })
  readonly useCase: TemplateUseCaseEnum;

  @ApiTemplateVersion()
  readonly version?: number;

  @ApiTemplateContent({ required: true })
  readonly content: string;

  @ApiTemplateContentUrl({ required: true })
  readonly contentUrl: string;

  @ApiTemplatePayloadSchema({ required: true })
  readonly payloadSchema: Record<string, any>;

  @ApiTemplateActive()
  readonly active?: boolean;
}

/**
 * Template list request DTO with filtering options
 * Based on table indexes for filterable fields
 */
export class TemplateListRequest
  extends ListOptionResponse
  implements ListTemplatePropsOptions
{
  @ApiTemplateCode({ required: false })
  readonly code?: string;

  @ApiTemplateName({ required: false })
  readonly name?: string;

  @ApiTemplateListOrderBy()
  readonly orderBy?: ListTemplateOrderEnum;
}

/**
 * Template page response DTO with metadata for pagination
 */
export class TemplatePageResponse {
  @ApiTemplateList(TemplateListResponse)
  readonly data: TemplateListResponse[];

  @ApiTemplateListMeta()
  readonly meta: ListMetaResponse;
}
