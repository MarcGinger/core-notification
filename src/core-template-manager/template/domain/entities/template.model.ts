/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export enum TemplateTransportEnum {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  TEAMS = 'teams',
}

export enum TemplateUseCaseEnum {
  STATEMENT = 'statement',
  INVOICE = 'invoice',
  QUOTE = 'quote',
  GENERIC = 'generic',
}

export interface ITemplate {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly transport: TemplateTransportEnum;
  readonly useCase: TemplateUseCaseEnum;
  readonly version?: number;
  readonly content: string;
  readonly contentUrl: string;
  readonly payloadSchema: Record<string, any>;
  readonly active?: boolean;
}

/**
 * Template data for EventStore serialization without large content field.
 * Content is stored separately in Azure Blob Storage for performance.
 */
export interface ITemplateEventData {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly transport: TemplateTransportEnum;
  readonly useCase: TemplateUseCaseEnum;
  readonly version?: number;
  readonly contentUrl: string;
  readonly payloadSchema: Record<string, any>;
  readonly active?: boolean;
}
