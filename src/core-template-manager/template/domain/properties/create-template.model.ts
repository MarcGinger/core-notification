/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { TemplateTransportEnum, TemplateUseCaseEnum } from '../entities';

export interface CreateTemplateProps {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly transport: TemplateTransportEnum;
  readonly useCase: TemplateUseCaseEnum;
  readonly content: string;
  readonly payloadSchema: Record<string, any>;
  readonly active?: boolean;
}
