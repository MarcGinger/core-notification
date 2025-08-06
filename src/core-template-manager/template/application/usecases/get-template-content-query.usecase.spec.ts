/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IUserToken } from 'src/shared/auth';
import { AzureBlobStorageService } from 'src/shared/infrastructure/azure-storage';
import {
  ITemplate,
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../../domain/entities';
import { TemplateRepository } from '../../infrastructure/repositories';
import { GetTemplateContentQueryUseCase } from './get-template-content-query.usecase';

describe('GetTemplateContentQueryUseCase', () => {
  let useCase: GetTemplateContentQueryUseCase;
  let repository: jest.Mocked<TemplateRepository>;
  let blobService: jest.Mocked<AzureBlobStorageService>;

  const mockUser: IUserToken = {
    sub: 'user123',
    preferred_username: 'testuser',
    tenant: 'tenant123',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  } as IUserToken;

  const mockTemplate: ITemplate = {
    code: 'TEST_TEMPLATE',
    name: 'Test Template',
    transport: TemplateTransportEnum.SLACK,
    useCase: TemplateUseCaseEnum.GENERIC,
    version: 1,
    content: '', // Empty initially, should be populated from blob
    contentUrl:
      'https://gstudios.blob.core.windows.net/private/tenant123/templates/slack/generic/TEST_TEMPLATE/v1.json',
    payloadSchema: { test: 'string' },
    active: true,
  };

  const mockBlobContent = Buffer.from(
    JSON.stringify({ message: 'Hello from Slack template!' }),
  );

  beforeEach(async () => {
    const mockRepository = {
      getTemplate: jest.fn(),
    };

    const mockBlobService = {
      getBlob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTemplateContentQueryUseCase,
        {
          provide: TemplateRepository,
          useValue: mockRepository,
        },
        {
          provide: AzureBlobStorageService,
          useValue: mockBlobService,
        },
      ],
    }).compile();

    useCase = module.get<GetTemplateContentQueryUseCase>(
      GetTemplateContentQueryUseCase,
    );
    repository = module.get(TemplateRepository);
    blobService = module.get(AzureBlobStorageService);
  });

  describe('execute', () => {
    it('should retrieve template content from blob storage successfully', async () => {
      // Arrange
      repository.getTemplate.mockResolvedValue(mockTemplate);
      blobService.getBlob.mockResolvedValue({
        content: mockBlobContent,
        info: {
          name: 'tenant123/templates/slack/generic/TEST_TEMPLATE/v1.json',
          contentLength: mockBlobContent.length,
          lastModified: new Date(),
          contentType: 'application/json',
          etag: '"test-etag"',
        },
      });

      // Act
      const result = await useCase.execute(mockUser, 'TEST_TEMPLATE');

      // Assert
      expect(repository.getTemplate).toHaveBeenCalledWith(
        mockUser,
        'TEST_TEMPLATE',
      );
      expect(blobService.getBlob).toHaveBeenCalledWith({
        containerName: 'private',
        blobName: 'tenant123/templates/slack/generic/TEST_TEMPLATE/v1.json',
      });
      expect(result).toEqual({
        ...mockTemplate,
        content: '{"message":"Hello from Slack template!"}',
      });
    });

    it('should throw NotFoundException when template is not found', async () => {
      // Arrange
      repository.getTemplate.mockRejectedValue(
        new NotFoundException('Template not found'),
      );

      // Act & Assert
      await expect(useCase.execute(mockUser, 'NON_EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.getTemplate).toHaveBeenCalledWith(
        mockUser,
        'NON_EXISTENT',
      );
      expect(blobService.getBlob).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when blob download fails', async () => {
      // Arrange
      repository.getTemplate.mockResolvedValue(mockTemplate);
      blobService.getBlob.mockRejectedValue(new Error('Blob not found'));

      // Act & Assert
      await expect(useCase.execute(mockUser, 'TEST_TEMPLATE')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.getTemplate).toHaveBeenCalledWith(
        mockUser,
        'TEST_TEMPLATE',
      );
      expect(blobService.getBlob).toHaveBeenCalledWith({
        containerName: 'private',
        blobName: 'tenant123/templates/slack/generic/TEST_TEMPLATE/v1.json',
      });
    });

    it('should handle different content URL formats correctly', async () => {
      // Arrange
      const templateWithDifferentUrl = {
        ...mockTemplate,
        contentUrl:
          'https://gstudios.blob.core.windows.net/private/core/templates/email/invoice/EMAIL_TEMPLATE/v2.html',
      };

      repository.getTemplate.mockResolvedValue(templateWithDifferentUrl);
      blobService.getBlob.mockResolvedValue({
        content: Buffer.from('<html><body>Email content</body></html>'),
        info: {
          name: 'core/templates/email/invoice/EMAIL_TEMPLATE/v2.html',
          contentLength: 100,
          lastModified: new Date(),
          contentType: 'text/html',
          etag: '"test-etag-2"',
        },
      });

      // Act
      const result = await useCase.execute(mockUser, 'EMAIL_TEMPLATE');

      // Assert
      expect(blobService.getBlob).toHaveBeenCalledWith({
        containerName: 'private',
        blobName: 'core/templates/email/invoice/EMAIL_TEMPLATE/v2.html',
      });
      expect(result.content).toBe('<html><body>Email content</body></html>');
    });
  });
});
