/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

/**
 * Service-wide constants for the bull transaction example bounded context
 *
 * This value object encapsulates fundamental domain concepts that are
 * consistent across all aggregates within the bull-transaction service.
 *
 * Domain Context: Cross-cutting domain constants
 * Bounded Context: bull-transaction Module
 */
export class BullTransactionServiceConstants {
  /**
   * Service identifier for the bull-transaction bounded context
   * Used in event metadata, logging, and service identification
   */
  static readonly SERVICE_NAME = 'bull-transaction' as const;

  /**
   * Service version for compatibility and migration tracking
   */
  static readonly SERVICE_VERSION = '1' as const;

  /**
   * Bounded context identifier for domain separation
   */
  static readonly BOUNDED_CONTEXT = 'bullTransaction' as const;

  /**
   * Default event store category for this service
   */
  static readonly EVENT_STORE_CATEGORY =
    `${this.BOUNDED_CONTEXT}-${this.SERVICE_NAME}` as const;

  /**
   * Service metadata for event sourcing and monitoring
   */
  static getServiceMetadata(): {
    serviceName: string;
    serviceVersion: string;
    boundedContext: string;
    eventStoreCategory: string;
  } {
    return {
      serviceName: this.SERVICE_NAME,
      serviceVersion: this.SERVICE_VERSION,
      boundedContext: this.BOUNDED_CONTEXT,
      eventStoreCategory: this.EVENT_STORE_CATEGORY,
    };
  }

  /**
   * Create standardized service metadata for event streams
   */
  static createEventMetadata(
    aggregateType: string,
    correlationId?: string,
    causationId?: string,
  ): {
    service: string;
    context: string;
    aggregateType: string;
    version: string;
    correlationId?: string;
    causationId?: string;
  } {
    return {
      service: this.SERVICE_NAME,
      context: this.BOUNDED_CONTEXT,
      aggregateType,
      version: this.SERVICE_VERSION,
      correlationId,
      causationId,
    };
  }

  /**
   * Validate if a service name matches this bounded context
   */
  static isValidServiceName(serviceName: string): boolean {
    return serviceName === this.SERVICE_NAME;
  }

  /**
   * Get logging context for this service
   */
  static getLoggingContext(
    component: string,
    method: string,
    identifier?: string,
  ): {
    service: string;
    boundedContext: string;
    component: string;
    method: string;
    identifier?: string;
  } {
    return {
      service: this.SERVICE_NAME,
      boundedContext: this.BOUNDED_CONTEXT,
      component,
      method,
      identifier,
    };
  }
}
