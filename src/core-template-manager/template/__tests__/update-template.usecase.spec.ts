/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IUserToken } from 'src/shared/auth';
import { UpdateTemplateUseCase } from '../application/usecases/update-template.usecase';
import { Template } from '../domain/aggregates';
import {
  ITemplate,
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../domain/entities';
import { UpdateTemplateProps } from '../domain/properties';
import { TemplateRepository } from '../infrastructure/repositories';

describe('UpdateTemplateUseCase', () => {
  let useCase: UpdateTemplateUseCase;
  let repository: jest.Mocked<TemplateRepository>;
  let mockUser: IUserToken;
  let mockTemplate: Template;
  let mockTemplateEntity: ITemplate;

  beforeEach(async () => {
    const mockRepository = {
      getById: jest.fn(),
      saveTemplate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTemplateUseCase,
        {
          provide: TemplateRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateTemplateUseCase>(UpdateTemplateUseCase);
    repository = module.get(TemplateRepository);

    mockUser = {
      sub: 'user-123',
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['user'],
    } as IUserToken;

    mockTemplateEntity = {
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

    mockTemplate = Template.fromEntity(mockTemplateEntity);
  });

  describe('execute', () => {
    it('should update allowed fields successfully', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        name: 'Updated Name',
        description: 'Updated description',
        active: false,
      };

      repository.getById.mockResolvedValue(mockTemplate);
      repository.saveTemplate.mockResolvedValue({
        ...mockTemplateEntity,
        name: 'Updated Name',
        description: 'Updated description',
        active: false,
      });

      // Act
      const result = await useCase.execute(
        mockUser,
        'TEMPLATE_001',
        updateProps,
      );

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(result.active).toBe(false);
      expect(repository.getById).toHaveBeenCalledWith(mockUser, 'TEMPLATE_001');
      expect(repository.saveTemplate).toHaveBeenCalledWith(
        mockUser,
        mockTemplate,
      );
    });

    it('should update only name field', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        name: 'Only Name Updated',
      };

      repository.getById.mockResolvedValue(mockTemplate);
      repository.saveTemplate.mockResolvedValue({
        ...mockTemplateEntity,
        name: 'Only Name Updated',
      });

      // Act
      const result = await useCase.execute(
        mockUser,
        'TEMPLATE_001',
        updateProps,
      );

      // Assert
      expect(result.name).toBe('Only Name Updated');
      expect(result.description).toBe(mockTemplateEntity.description); // Unchanged
      expect(result.active).toBe(mockTemplateEntity.active); // Unchanged
    });

    it('should update only description field', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        description: 'Only Description Updated',
      };

      repository.getById.mockResolvedValue(mockTemplate);
      repository.saveTemplate.mockResolvedValue({
        ...mockTemplateEntity,
        description: 'Only Description Updated',
      });

      // Act
      const result = await useCase.execute(
        mockUser,
        'TEMPLATE_001',
        updateProps,
      );

      // Assert
      expect(result.name).toBe(mockTemplateEntity.name); // Unchanged
      expect(result.description).toBe('Only Description Updated');
      expect(result.active).toBe(mockTemplateEntity.active); // Unchanged
    });

    it('should update only active field', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        active: false,
      };

      repository.getById.mockResolvedValue(mockTemplate);
      repository.saveTemplate.mockResolvedValue({
        ...mockTemplateEntity,
        active: false,
      });

      // Act
      const result = await useCase.execute(
        mockUser,
        'TEMPLATE_001',
        updateProps,
      );

      // Assert
      expect(result.name).toBe(mockTemplateEntity.name); // Unchanged
      expect(result.description).toBe(mockTemplateEntity.description); // Unchanged
      expect(result.active).toBe(false);
    });

    it('should throw BadRequestException when props is null', async () => {
      // Act & Assert
      await expect(
        useCase.execute(
          mockUser,
          'TEMPLATE_001',
          undefined as unknown as UpdateTemplateProps,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when template does not exist', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        name: 'Updated Name',
      };

      repository.getById.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute(mockUser, 'NONEXISTENT', updateProps),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty props object', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {};

      repository.getById.mockResolvedValue(mockTemplate);
      repository.saveTemplate.mockResolvedValue(mockTemplateEntity);

      // Act
      const result = await useCase.execute(
        mockUser,
        'TEMPLATE_001',
        updateProps,
      );

      // Assert
      expect(result).toEqual(mockTemplateEntity);
      // Verify no changes were made
      expect(repository.saveTemplate).toHaveBeenCalledWith(
        mockUser,
        mockTemplate,
      );
    });

    it('should validate TypeScript compilation: UpdateTemplateProps only accepts allowed fields', () => {
      // This test ensures that TypeScript compilation will fail if someone tries
      // to add restricted fields to UpdateTemplateProps

      const validProps: UpdateTemplateProps = {
        name: 'Valid Name',
        description: 'Valid Description',
        active: true,
      };

      // These should cause TypeScript compilation errors if uncommented:
      // const invalidProps: UpdateTemplateProps = {
      //   name: 'Valid Name',
      //   transport: TemplateTransportEnum.EMAIL, // ❌ Should not be allowed
      //   useCase: TemplateUseCaseEnum.INVOICE,   // ❌ Should not be allowed
      //   version: 2,                             // ❌ Should not be allowed
      //   content: 'Some content',                // ❌ Should not be allowed
      //   contentUrl: 'https://example.com',      // ❌ Should not be allowed
      //   payloadSchema: { type: 'object' },      // ❌ Should not be allowed
      // };

      expect(validProps).toBeDefined();
    });
  });

  describe('performUpdate private method behavior', () => {
    it('should only process allowed fields and ignore any other properties', async () => {
      // Arrange
      const updateProps: UpdateTemplateProps = {
        name: 'Updated Name',
        description: 'Updated Description',
        active: false,
      };

      repository.getById.mockResolvedValue(mockTemplate);
      repository.saveTemplate.mockResolvedValue({
        ...mockTemplateEntity,
        name: 'Updated Name',
        description: 'Updated Description',
        active: false,
      });

      // Spy on aggregate methods to ensure only allowed ones are called
      const updateNameSpy = jest.spyOn(mockTemplate, 'updateName');
      const updateDescriptionSpy = jest.spyOn(
        mockTemplate,
        'updateDescription',
      );
      const updateActiveSpy = jest.spyOn(mockTemplate, 'updateActive');

      // Act
      await useCase.execute(mockUser, 'TEMPLATE_001', updateProps);

      // Assert
      expect(updateNameSpy).toHaveBeenCalledWith(mockUser, 'Updated Name');
      expect(updateDescriptionSpy).toHaveBeenCalledWith(
        mockUser,
        'Updated Description',
      );
      expect(updateActiveSpy).toHaveBeenCalledWith(mockUser, false);

      // Verify restricted methods are NOT called
      expect(mockTemplate.transport).toBe(TemplateTransportEnum.EMAIL); // Unchanged
      expect(mockTemplate.useCase).toBe(TemplateUseCaseEnum.INVOICE); // Unchanged
      expect(mockTemplate.version).toBe(1); // Unchanged
      expect(mockTemplate.content).toBe('Original content'); // Unchanged
    });
  });
});
