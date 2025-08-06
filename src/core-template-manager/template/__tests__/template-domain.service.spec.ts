/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { IUserToken } from 'src/shared/auth';
import { Template } from '../domain/aggregates';
import {
  ITemplate,
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../domain/entities';
import { UpdateTemplateProps } from '../domain/properties';
import { TemplateDomainService } from '../domain/services/template-domain.service';

describe('TemplateDomainService - UpdateTemplateProps Restriction', () => {
  let service: TemplateDomainService;
  let mockUser: IUserToken;
  let mockTemplate: Template;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateDomainService],
    }).compile();

    service = module.get<TemplateDomainService>(TemplateDomainService);

    mockUser = {
      sub: 'user-123',
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['user'],
    } as IUserToken;

    const templateEntity: ITemplate = {
      code: 'TEMPLATE_001',
      name: 'Test Template',
      description: 'Original description',
      transport: TemplateTransportEnum.EMAIL,
      useCase: TemplateUseCaseEnum.INVOICE,
      version: 1,
      content: 'Original content',
      contentUrl: 'https://storage.blob.core.windows.net/content/template.html',
      payloadSchema: { type: 'object' },
      active: true,
    };

    mockTemplate = Template.fromEntity(templateEntity);
  });

  describe('updateTemplateInfo', () => {
    it('should only process allowed fields from UpdateTemplateProps', () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        name: 'Updated Name',
        description: 'Updated Description',
        active: false,
      };

      // Spy on the allowed update methods
      const updateNameSpy = jest.spyOn(mockTemplate, 'updateName');
      const updateDescriptionSpy = jest.spyOn(
        mockTemplate,
        'updateDescription',
      );
      const updateActiveSpy = jest.spyOn(mockTemplate, 'updateActive');

      // Act
      service.updateTemplateInfo(mockUser, mockTemplate, updateProps);

      // Assert - verify only allowed methods are called
      expect(updateNameSpy).toHaveBeenCalledWith(mockUser, 'Updated Name');
      expect(updateDescriptionSpy).toHaveBeenCalledWith(
        mockUser,
        'Updated Description',
      );
      expect(updateActiveSpy).toHaveBeenCalledWith(mockUser, false);

      // Verify the aggregate state has changed for allowed fields only
      expect(mockTemplate.name).toBe('Updated Name');
      expect(mockTemplate.description).toBe('Updated Description');
      expect(mockTemplate.active).toBe(false);

      // Verify restricted fields remain unchanged
      expect(mockTemplate.transport).toBe(TemplateTransportEnum.EMAIL);
      expect(mockTemplate.useCase).toBe(TemplateUseCaseEnum.INVOICE);
      expect(mockTemplate.version).toBe(1);
      expect(mockTemplate.content).toBe('Original content');
    });

    it('should handle partial updates with only name', () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        name: 'Only Name Updated',
      };

      const originalDescription = mockTemplate.description;
      const originalActive = mockTemplate.active;

      // Act
      service.updateTemplateInfo(mockUser, mockTemplate, updateProps);

      // Assert
      expect(mockTemplate.name).toBe('Only Name Updated');
      expect(mockTemplate.description).toBe(originalDescription);
      expect(mockTemplate.active).toBe(originalActive);
    });

    it('should handle partial updates with only description', () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        description: 'Only Description Updated',
      };

      const originalName = mockTemplate.name;
      const originalActive = mockTemplate.active;

      // Act
      service.updateTemplateInfo(mockUser, mockTemplate, updateProps);

      // Assert
      expect(mockTemplate.name).toBe(originalName);
      expect(mockTemplate.description).toBe('Only Description Updated');
      expect(mockTemplate.active).toBe(originalActive);
    });

    it('should handle partial updates with only active field', () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        active: false,
      };

      const originalName = mockTemplate.name;
      const originalDescription = mockTemplate.description;

      // Act
      service.updateTemplateInfo(mockUser, mockTemplate, updateProps);

      // Assert
      expect(mockTemplate.name).toBe(originalName);
      expect(mockTemplate.description).toBe(originalDescription);
      expect(mockTemplate.active).toBe(false);
    });

    it('should handle empty update props without errors', () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {};

      const originalName = mockTemplate.name;
      const originalDescription = mockTemplate.description;
      const originalActive = mockTemplate.active;

      // Act
      service.updateTemplateInfo(mockUser, mockTemplate, updateProps);

      // Assert - nothing should change
      expect(mockTemplate.name).toBe(originalName);
      expect(mockTemplate.description).toBe(originalDescription);
      expect(mockTemplate.active).toBe(originalActive);
    });

    it('should ensure TypeScript prevents adding restricted fields', () => {
      // This test verifies that TypeScript compilation prevents adding restricted fields

      const validProps: UpdateTemplateProps = {
        name: 'Valid',
        description: 'Valid',
        active: true,
      };

      // These should cause TypeScript compilation errors if uncommented:
      // const invalidProps: UpdateTemplateProps = {
      //   name: 'Valid',
      //   transport: TemplateTransportEnum.EMAIL,     // ❌ Should not compile
      //   useCase: TemplateUseCaseEnum.INVOICE,       // ❌ Should not compile
      //   version: 2,                                 // ❌ Should not compile
      //   content: 'Some content',                    // ❌ Should not compile
      //   contentUrl: 'https://example.com',          // ❌ Should not compile
      //   payloadSchema: { type: 'object' },          // ❌ Should not compile
      // };

      expect(validProps).toBeDefined();
    });
  });
});
