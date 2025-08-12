/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { IUserToken } from 'src/shared/auth';
import { randomUUID } from 'crypto';
import { Maker } from '../aggregates';
import { CreateMakerProps, UpdateMakerProps } from '../properties';
import { MakerIdentifier } from '../value-objects';

/**
 * Domain service for handling complex business operations that span multiple aggregates
 * or require complex coordination. This service contains business logic that doesn't
 * naturally fit within a single aggregate.
 *
 * Key responsibilities:
 * - Complex entity creation involving multiple related entities
 * - Business operations requiring coordination across aggregates
 * - Complex validation that involves external entity dependencies
 * - Business rules that span multiple bounded contexts
 */
@Injectable()
export class MakerDomainService {
  /**
   * TODO TRACKING - Simplified Domain Service Approach
   *
   * Maker is a simple entity with basic properties (code, name, description, active)
   * and no cross-aggregate dependencies. Unlike Product or Rail domain services which
   * manage complex relationships and external dependencies, Maker domain service
   * focuses on orchestration without complex validation:
   *
   * 1. Entity Creation: Simple aggregate creation with basic validation
   * 2. Update Coordination: Direct delegation to aggregate methods
   * 3. Deletion Orchestration: Simple delegation to aggregate deletion
   *
   * Complex business rules are handled by the aggregate itself via validateState().
   * This follows DDD principles - domain services only when business logic spans aggregates.
   */
  /**
   * Creates a new Maker aggregate with complex entity resolution and coordination.
   * This method handles the orchestration of fetching related entities and ensuring
   * all dependencies are properly resolved before creating the aggregate.
   */
  async createMaker(
    user: IUserToken,
    createData: CreateMakerProps,
  ): Promise<Maker> {
    // Generate unique identifier for the new maker
    const makerCode = randomUUID();

    // Create the aggregate using the factory method which emits creation events
    const maker = Maker.create(user, {
      id: MakerIdentifier.fromString(makerCode),
      from: createData.from,
      to: createData.to,
      description: createData.description,
      status: createData.status,
      scheduledAt: createData.scheduledAt,
      correlationId: createData.correlationId,
    });

    return Promise.resolve(maker);
  }
  /**
   * Coordinates complex maker updates with cross-cutting business rule validation.
   * This method handles updates that require complex validation across multiple properties
   * or external dependencies before delegating to individual aggregate methods.

   *
   * @param user - The user performing the update
   * @param maker - The Maker aggregate to update
   * @param updateData - Partial update data containing the fields to update
   *
   * @example
   * ```typescript
   * await makerDomainService.updateMakerInfo(user, maker, {
   *   name: "New Name",
   *   description: "Updated description",
   * });
   * ```
   *
   * Note: This method validates cross-cutting business rules before applying changes.
   * Each field is updated individually using the aggregate's focused update methods,
   * ensuring proper validation and event emission for each change.
   */
  updateMakerInfo(
    user: IUserToken,
    maker: Maker,
    updateData: Partial<UpdateMakerProps>,
  ): void {
    // Note: Maker is a simple entity - complex cross-cutting validation is not needed.
    // All business rules are handled directly by the aggregate's update methods.

    // Apply updates using individual aggregate methods which handle validation and events
    if (updateData.from !== undefined) {
      maker.updateFrom(user, updateData.from);
    }

    if (updateData.to !== undefined) {
      maker.updateTo(user, updateData.to);
    }

    if (updateData.description !== undefined) {
      maker.updateDescription(user, updateData.description);
    }

    if (updateData.status !== undefined) {
      maker.updateStatus(user, updateData.status);
    }

    if (updateData.scheduledAt !== undefined) {
      maker.updateScheduledAt(user, updateData.scheduledAt);
    }

    if (updateData.correlationId !== undefined) {
      maker.updateCorrelationId(user, updateData.correlationId);
    }
  }

  // Private helper methods for complex business rule validation

  /**
   * Note: Maker is a simple entity with basic properties and no cross-aggregate dependencies.
   * Complex business rule validation is not needed as all validation is handled by the aggregate itself.
   * This method is intentionally simplified compared to Product/Rail domain services which manage
   * complex relationships and cross-cutting concerns.
   */
}
