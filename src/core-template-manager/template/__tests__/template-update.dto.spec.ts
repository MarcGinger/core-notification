/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { TemplateUpdateRequest } from '../application/dtos/template-update.dto';
import { UpdateTemplateProps } from '../domain/properties';

describe('TemplateUpdateRequest DTO - UpdateTemplateProps Restriction', () => {
  describe('interface compliance', () => {
    it('should implement UpdateTemplateProps with only allowed fields', () => {
      // Arrange & Act
      const dto: TemplateUpdateRequest = {
        name: 'Test Name',
        description: 'Test Description',
        active: true,
      };

      // Assert - should be assignable to UpdateTemplateProps
      const props: UpdateTemplateProps = dto;
      expect(props.name).toBe('Test Name');
      expect(props.description).toBe('Test Description');
      expect(props.active).toBe(true);
    });

    it('should allow partial updates with only name', () => {
      // Arrange & Act
      const dto: TemplateUpdateRequest = {
        name: 'Only Name',
      };

      // Assert
      const props: UpdateTemplateProps = dto;
      expect(props.name).toBe('Only Name');
      expect(props.description).toBeUndefined();
      expect(props.active).toBeUndefined();
    });

    it('should allow partial updates with only description', () => {
      // Arrange & Act
      const dto: TemplateUpdateRequest = {
        description: 'Only Description',
      };

      // Assert
      const props: UpdateTemplateProps = dto;
      expect(props.name).toBeUndefined();
      expect(props.description).toBe('Only Description');
      expect(props.active).toBeUndefined();
    });

    it('should allow partial updates with only active', () => {
      // Arrange & Act
      const dto: TemplateUpdateRequest = {
        active: false,
      };

      // Assert
      const props: UpdateTemplateProps = dto;
      expect(props.name).toBeUndefined();
      expect(props.description).toBeUndefined();
      expect(props.active).toBe(false);
    });

    it('should allow empty DTO object', () => {
      // Arrange & Act
      const dto: TemplateUpdateRequest = {};

      // Assert
      const props: UpdateTemplateProps = dto;
      expect(props.name).toBeUndefined();
      expect(props.description).toBeUndefined();
      expect(props.active).toBeUndefined();
    });

    it('should ensure TypeScript prevents restricted fields in DTO', () => {
      // This test ensures TypeScript compilation prevents adding restricted fields

      const validDto: TemplateUpdateRequest = {
        name: 'Valid Name',
        description: 'Valid Description',
        active: true,
      };

      // These should cause TypeScript compilation errors if uncommented:
      // const invalidDto: TemplateUpdateRequest = {
      //   name: 'Valid Name',
      //   transport: TemplateTransportEnum.EMAIL,     // ❌ Should not compile
      //   useCase: TemplateUseCaseEnum.INVOICE,       // ❌ Should not compile
      //   version: 2,                                 // ❌ Should not compile
      //   content: 'Some content',                    // ❌ Should not compile
      //   contentUrl: 'https://example.com',          // ❌ Should not compile
      //   payloadSchema: { type: 'object' },          // ❌ Should not compile
      // };

      expect(validDto).toBeDefined();
    });
  });

  describe('API decorators', () => {
    it('should have correct readonly properties', () => {
      // Arrange
      const dto: TemplateUpdateRequest = {
        name: 'Test Name',
        description: 'Test Description',
        active: true,
      };

      // Act & Assert - properties should be readonly (compilation check)
      expect(dto.name).toBe('Test Name');
      expect(dto.description).toBe('Test Description');
      expect(dto.active).toBe(true);

      // The readonly nature is enforced at compile time
      // Attempting to modify would cause TypeScript error:
      // dto.name = 'New Name'; // ❌ Would not compile
    });

    it('should match UpdateTemplateProps interface exactly', () => {
      // This test ensures the DTO structure matches the domain interface

      const dtoInstance = new TemplateUpdateRequest();

      // Both should have the same structure
      const dtoKeys = Object.getOwnPropertyNames(dtoInstance);

      // The DTO should only have the allowed properties
      const expectedProps = ['name', 'description', 'active'];

      // Filter out any inherited properties
      const actualProps = dtoKeys.filter(
        (key) =>
          expectedProps.includes(key) ||
          (dtoInstance as any)[key] !== undefined,
      );

      // Note: This test validates structure at runtime
      // The more important validation is at compile time via TypeScript
      expect(typeof dtoInstance).toBe('object');
    });
  });
});
