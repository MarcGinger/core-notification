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
import { Template } from '../aggregates';
import {
  EnhancedCreateTemplateProps,
  UpdateTemplateProps,
} from '../properties';
import { TemplateIdentifier } from '../value-objects';

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
export class TemplateDomainService {
  /**
   * TODO TRACKING - Simplified Domain Service Approach
   *
   * Template is a simple entity with basic properties (code, name, description, active)
   * and no cross-aggregate dependencies. Unlike Product or Rail domain services which
   * manage complex relationships and external dependencies, Template domain service
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
   * Creates a new Template aggregate with complex entity resolution and coordination.
   * This method handles the orchestration of fetching related entities and ensuring
   * all dependencies are properly resolved before creating the aggregate.
   */
  async createTemplate(
    user: IUserToken,
    createData: EnhancedCreateTemplateProps,
  ): Promise<Template> {
    // Create the aggregate using the factory method which emits creation events
    const template = Template.create(user, {
      code: TemplateIdentifier.fromString(createData.code),
      name: createData.name,
      description: createData.description,
      transport: createData.transport,
      useCase: createData.useCase,
      version: createData.version,
      content: createData.content,
      contentUrl: createData.contentUrl,
      payloadSchema: createData.payloadSchema,
      active: createData.active,
    });

    return Promise.resolve(template);
  }
  /**
   * Coordinates complex template updates with cross-cutting business rule validation.
   * This method handles updates that require complex validation across multiple properties
   * or external dependencies before delegating to individual aggregate methods.

   *
   * @param user - The user performing the update
   * @param template - The Template aggregate to update
   * @param updateData - Partial update data containing the fields to update
   *
   * @example
   * ```typescript
   * await templateDomainService.updateTemplateInfo(user, template, {
   *   name: "New Name",
   *   description: "Updated description",
   *   active: true
   * });
   * ```
   *
   * Note: This method validates cross-cutting business rules before applying changes.
   * Each field is updated individually using the aggregate's focused update methods,
   * ensuring proper validation and event emission for each change.
   */
  updateTemplateInfo(
    user: IUserToken,
    template: Template,
    updateData: Partial<UpdateTemplateProps>,
  ): void {
    // Note: Template is a simple entity - complex cross-cutting validation is not needed.
    // All business rules are handled directly by the aggregate's update methods.

    // Apply updates using individual aggregate methods which handle validation and events
    // Only update the fields allowed by UpdateTemplateProps interface
    if (updateData.name !== undefined) {
      template.updateName(user, updateData.name);
    }

    if (updateData.description !== undefined) {
      template.updateDescription(user, updateData.description);
    }

    if (updateData.active !== undefined) {
      template.updateActive(user, updateData.active);
    }
  }

  // Private helper methods for complex business rule validation

  /**
   * Note: Template is a simple entity with basic properties and no cross-aggregate dependencies.
   * Complex business rule validation is not needed as all validation is handled by the aggregate itself.
   * This method is intentionally simplified compared to Product/Rail domain services which manage
   * complex relationships and cross-cutting concerns.
   */
}
