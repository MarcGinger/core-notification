/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CoreTemplateManagerServiceConstants } from './service-constants';

/**
 * Centralized logging context helper for the Bank Product bounded context
 *
 * This utility ensures DRY principle by providing a single location for
 * enhanced logging context creation across repositories, use cases, and services.
 *
 * Domain Context: Cross-cutting logging concern
 * Bounded Context: Bank Product Module
 */
export class CoreTemplateManagerLoggingHelper {
  /**
   * Create enhanced logging context using centralized service constants
   * Provides consistent logging structure across all components
   *
   * @param component - The component name (e.g., 'ChannelRepository', 'CreateChannelUseCase')
   * @param method - The method name (e.g., 'execute', 'save', 'get')
   * @param identifier - Optional entity identifier (e.g., channel code)
   * @param user - Optional user token for enhanced context
   * @param additionalContext - Optional additional context properties
   * @returns Enhanced logging context with service constants and user information
   */
  static createEnhancedLogContext(
    component: string,
    method: string,
    identifier?: string,
    user?: {
      tenant?: string;
      preferred_username?: string;
      sub?: string;
    },
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    // Get base context from centralized service constants
    const baseContext = CoreTemplateManagerServiceConstants.getLoggingContext(
      component,
      method,
      identifier,
    );

    // Enhance with user information and additional context
    const enhancedContext: Record<string, unknown> = { ...baseContext };

    if (user) {
      enhancedContext.tenant = user.tenant;
      enhancedContext.username = user.preferred_username;
      enhancedContext.userId = user.sub;
    }

    if (additionalContext) {
      Object.assign(enhancedContext, additionalContext);
    }

    return enhancedContext;
  }

  /**
   * Create logging context specifically for saga operations
   * Includes saga-specific metadata for distributed transaction tracking
   */
  static createSagaLogContext(
    component: string,
    method: string,
    identifier?: string,
    user?: {
      tenant?: string;
      preferred_username?: string;
      sub?: string;
    },
    sagaContext?: {
      sagaId?: string;
      correlationId?: string;
      operationId?: string;
      isRetry?: boolean;
    },
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    const baseContext = this.createEnhancedLogContext(
      component,
      method,
      identifier,
      user,
      additionalContext,
    );

    if (sagaContext) {
      Object.assign(baseContext, {
        sagaId: sagaContext.sagaId,
        correlationId: sagaContext.correlationId,
        operationId: sagaContext.operationId,
        isRetry: sagaContext.isRetry || false,
      });
    }

    return baseContext;
  }
}
