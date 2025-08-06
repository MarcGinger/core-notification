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
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../../domain/entities';
import { CreateTemplateProps } from '../../domain/properties';
import {
  ApiTemplateActive,
  ApiTemplateCode,
  ApiTemplateContent,
  ApiTemplateDescription,
  ApiTemplateName,
  ApiTemplatePayloadSchema,
  ApiTemplateTransport,
  ApiTemplateUseCase,
} from './decorators';

/**
 * Template create request DTO
 */
export class TemplateCreateRequest implements CreateTemplateProps {
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

  @ApiTemplateContent({ required: true })
  readonly content: string;

  @ApiTemplatePayloadSchema({ required: true })
  readonly payloadSchema: Record<string, any>;

  @ApiTemplateActive()
  readonly active?: boolean;
}
