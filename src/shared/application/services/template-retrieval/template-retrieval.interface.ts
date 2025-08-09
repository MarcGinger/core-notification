/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from '../../../auth';

/**
 * Generic template data interface for any template renderer
 */
export interface ITemplateContent {
  readonly code: string;
  readonly name: string;
  readonly content: string;
  readonly contentUrl: string;
  readonly version?: number;
  readonly active?: boolean;
  readonly payloadSchema?: Record<string, any>;
  readonly transport?: string;
  readonly useCase?: string;
  readonly description?: string;
}

/**
 * Template retrieval options for filtering and querying
 */
export interface ITemplateRetrievalOptions {
  readonly includeInactive?: boolean;
  readonly version?: number;
  readonly useCase?: string;
  readonly transport?: string;
}

/**
 * Generic interface for template retrieval services
 * This abstraction allows any template renderer to retrieve templates
 * without being tightly coupled to the core-template-manager implementation
 */
export interface ITemplateRetrievalService {
  /**
   * Retrieves a single template by code
   * @param user - User context for tenant isolation
   * @param templateCode - Unique template identifier
   * @param options - Optional retrieval options
   * @returns Promise<ITemplateContent | undefined> - Template if found, undefined otherwise
   */
  getTemplate(
    user: IUserToken,
    templateCode: string,
    options?: ITemplateRetrievalOptions,
  ): Promise<ITemplateContent | undefined>;

  /**
   * Checks if a template exists without loading its content
   * @param user - User context for tenant isolation
   * @param templateCode - Template identifier to check
   * @param options - Optional retrieval options
   * @returns Promise<boolean> - True if template exists
   */
  templateExists(
    user: IUserToken,
    templateCode: string,
    options?: ITemplateRetrievalOptions,
  ): Promise<boolean>;

  /**
   * Gets template content only (optimized for rendering)
   * @param user - User context for tenant isolation
   * @param templateCode - Template identifier
   * @param options - Optional retrieval options
   * @returns Promise<string | undefined> - Template content if found
   */
  getTemplateContent(
    user: IUserToken,
    templateCode: string,
    options?: ITemplateRetrievalOptions,
  ): Promise<string | undefined>;
}

/**
 * Token for dependency injection
 */
export const TEMPLATE_RETRIEVAL_SERVICE = Symbol('ITemplateRetrievalService');
