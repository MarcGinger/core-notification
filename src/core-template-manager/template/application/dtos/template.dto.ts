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
  ITemplate,
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../../domain';
import {
  ApiTemplateActive,
  ApiTemplateCode,
  ApiTemplateContent,
  ApiTemplateContentUrl,
  ApiTemplateDescription,
  ApiTemplateName,
  ApiTemplatePayloadSchema,
  ApiTemplateTransport,
  ApiTemplateUseCase,
  ApiTemplateVersion,
} from './decorators';

/**
 * Template response DTO
 */
export class TemplateResponse implements ITemplate {
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
