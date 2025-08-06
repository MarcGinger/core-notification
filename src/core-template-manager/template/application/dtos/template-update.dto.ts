/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { UpdateTemplateProps } from '../../domain/properties';
import {
  ApiTemplateActive,
  ApiTemplateDescription,
  ApiTemplateName,
} from './decorators';

/**
 * Template update request DTO
 * Only allows updating the fields specified in UpdateTemplateProps interface
 */
export class TemplateUpdateRequest implements UpdateTemplateProps {
  @ApiTemplateName({ required: false })
  readonly name?: string;

  @ApiTemplateDescription()
  readonly description?: string;

  @ApiTemplateActive()
  readonly active?: boolean;
}
