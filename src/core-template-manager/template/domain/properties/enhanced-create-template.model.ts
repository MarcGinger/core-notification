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

/**
 * Enhanced template properties used internally by the domain service
 * Includes generated fields like version and contentUrl
 */
export interface EnhancedCreateTemplateProps {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly transport: TemplateTransportEnum;
  readonly useCase: TemplateUseCaseEnum;
  readonly version: number;
  readonly content: string;
  readonly contentUrl: string;
  readonly payloadSchema: Record<string, any>;
  readonly active?: boolean;
}
