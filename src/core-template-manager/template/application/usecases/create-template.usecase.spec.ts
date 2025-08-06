/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IUserToken } from 'src/shared/auth';
import { AzureBlobStorageService } from 'src/shared/infrastructure/azure-storage';
import {
  ITemplate,
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../../domain/entities';
import { CreateTemplateProps } from '../../domain/properties';
import { TemplateDomainService } from '../../domain/services';
import { TemplateRepository } from '../../infrastructure/repositories';
import { CreateTemplateUseCase } from './create-template.usecase';

describe('CreateTemplateUseCase - Version Generation', () => {
  let useCase: CreateTemplateUseCase;
  let repository: jest.Mocked<TemplateRepository>;
  let domainService: jest.Mocked<TemplateDomainService>;
  let blobService: jest.Mocked<AzureBlobStorageService>;

  const mockUser: IUserToken = {
    sub: 'user123',
    preferred_username: 'testuser',
    tenant: 'tenant123',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  } as IUserToken;

  const baseProps: CreateTemplateProps = {
    code: 'TEST_TEMPLATE',
    name: 'Test Template',
    transport: TemplateTransportEnum.EMAIL,
    useCase: TemplateUseCaseEnum.INVOICE,
    content: '<html><body>Test content</body></html>',
    payloadSchema: { test: 'string' },
    active: true,
  };

  beforeEach(async () => {
    const mockRepository = {
      getByCodes: jest.fn(),
      saveTemplate: jest.fn(),
    };

    const mockDomainService = {
      createTemplate: jest.fn(),
    };

    const mockBlobService = {
      uploadBlob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTemplateUseCase,
        {
          provide: TemplateRepository,
          useValue: mockRepository,
        },
        {
          provide: TemplateDomainService,
          useValue: mockDomainService,
        },
        {
          provide: AzureBlobStorageService,
          useValue: mockBlobService,
        },
      ],
    }).compile();

    useCase = module.get<CreateTemplateUseCase>(CreateTemplateUseCase);
    repository = module.get(TemplateRepository);
    domainService = module.get(TemplateDomainService);
    blobService = module.get(AzureBlobStorageService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Version Generation Logic', () => {
    it('should generate version 1 for new template (no existing versions)', async () => {
      // Arrange
      repository.getByCodes.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      domainService.createTemplate.mockResolvedValue({
        getUncommittedEvents: () => [],
      } as any);
      repository.saveTemplate.mockResolvedValue({
        code: 'TEST_TEMPLATE',
        version: 1,
      } as ITemplate);

      // Act
      const result = await useCase.execute(mockUser, baseProps);

      // Assert
      expect(repository.getByCodes).toHaveBeenCalledWith(mockUser, [
        'TEST_TEMPLATE',
      ]);
      expect(blobService.uploadBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          blobName:
            'private/tenant123/templates/email/invoice/TEST_TEMPLATE/v1.html',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            version: '1',
          }),
        }),
      );
      expect(result.version).toBe(1);
    });

    it('should generate version 4 when versions 1, 2, 3 exist', async () => {
      // Arrange
      const existingTemplates: ITemplate[] = [
        { code: 'TEST_TEMPLATE', version: 1 } as ITemplate,
        { code: 'TEST_TEMPLATE', version: 2 } as ITemplate,
        { code: 'TEST_TEMPLATE', version: 3 } as ITemplate,
      ];

      repository.getByCodes.mockResolvedValue(existingTemplates);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      domainService.createTemplate.mockResolvedValue({
        getUncommittedEvents: () => [],
      } as any);
      repository.saveTemplate.mockResolvedValue({
        code: 'TEST_TEMPLATE',
        version: 4,
      } as ITemplate);

      // Act
      const result = await useCase.execute(mockUser, baseProps);

      // Assert
      expect(blobService.uploadBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          blobName:
            'private/tenant123/templates/email/invoice/TEST_TEMPLATE/v4.html',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            version: '4',
          }),
        }),
      );
      expect(result.version).toBe(4);
    });

    it('should handle gaps in version numbers correctly', async () => {
      // Arrange - versions 1, 3, 7 exist (gaps at 2, 4, 5, 6)
      const existingTemplates: ITemplate[] = [
        { code: 'TEST_TEMPLATE', version: 1 } as ITemplate,
        { code: 'TEST_TEMPLATE', version: 3 } as ITemplate,
        { code: 'TEST_TEMPLATE', version: 7 } as ITemplate,
      ];

      repository.getByCodes.mockResolvedValue(existingTemplates);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      domainService.createTemplate.mockResolvedValue({
        getUncommittedEvents: () => [],
      } as any);
      repository.saveTemplate.mockResolvedValue({
        code: 'TEST_TEMPLATE',
        version: 8,
      } as ITemplate);

      // Act
      const result = await useCase.execute(mockUser, baseProps);

      // Assert - should use highest version + 1 (7 + 1 = 8)
      expect(blobService.uploadBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          blobName:
            'private/tenant123/templates/email/invoice/TEST_TEMPLATE/v8.html',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            version: '8',
          }),
        }),
      );
      expect(result.version).toBe(8);
    });

    it('should handle templates with missing version (default to 1)', async () => {
      // Arrange - one template with version, one without
      const existingTemplates: ITemplate[] = [
        { code: 'TEST_TEMPLATE', version: 2 } as ITemplate,
        { code: 'TEST_TEMPLATE' } as ITemplate, // No version property
      ];

      repository.getByCodes.mockResolvedValue(existingTemplates);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      domainService.createTemplate.mockResolvedValue({
        getUncommittedEvents: () => [],
      } as any);
      repository.saveTemplate.mockResolvedValue({
        code: 'TEST_TEMPLATE',
        version: 3,
      } as ITemplate);

      // Act
      const result = await useCase.execute(mockUser, baseProps);

      // Assert - should use highest version + 1 (2 + 1 = 3)
      expect(result.version).toBe(3);
    });

    it('should fallback to version 1 when repository query fails', async () => {
      // Arrange
      repository.getByCodes.mockRejectedValue(
        new Error('Database connection failed'),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      domainService.createTemplate.mockResolvedValue({
        getUncommittedEvents: () => [],
      } as any);
      repository.saveTemplate.mockResolvedValue({
        code: 'TEST_TEMPLATE',
        version: 1,
      } as ITemplate);

      // Act
      const result = await useCase.execute(mockUser, baseProps);

      // Assert - should fallback to version 1
      expect(blobService.uploadBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          blobName:
            'private/tenant123/templates/email/invoice/TEST_TEMPLATE/v1.html',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            version: '1',
          }),
        }),
      );
      expect(result.version).toBe(1);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('Failed to query existing versions'),
      );
    });

    it('should generate correct blob paths for different transports', async () => {
      // Test different transport types and their file extensions
      const testCases = [
        { transport: TemplateTransportEnum.EMAIL, extension: 'html' },
        { transport: TemplateTransportEnum.SMS, extension: 'txt' },
        { transport: TemplateTransportEnum.SLACK, extension: 'json' },
      ];

      for (const testCase of testCases) {
        // Arrange
        repository.getByCodes.mockResolvedValue([]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        domainService.createTemplate.mockResolvedValue({
          getUncommittedEvents: () => [],
        } as any);
        repository.saveTemplate.mockResolvedValue({
          code: 'TEST_TEMPLATE',
          version: 1,
        } as ITemplate);

        const propsWithTransport = {
          ...baseProps,
          transport: testCase.transport,
        };

        // Act
        await useCase.execute(mockUser, propsWithTransport);

        // Assert
        expect(blobService.uploadBlob).toHaveBeenCalledWith(
          expect.objectContaining({
            blobName: `private/tenant123/templates/${testCase.transport}/invoice/TEST_TEMPLATE/v1.${testCase.extension}`,
          }),
        );

        // Reset mocks for next iteration
        jest.clearAllMocks();
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'debug').mockImplementation();
      }
    });
  });

  describe('Content URL Generation', () => {
    it('should generate correct content URL with environment variable', async () => {
      // Arrange
      const originalEnv = process.env.AZURE_STORAGE_CONTAINER_PATH;
      process.env.AZURE_STORAGE_CONTAINER_PATH =
        'https://custom-storage.blob.core.windows.net';

      repository.getByCodes.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      blobService.uploadBlob.mockResolvedValue({ name: 'test' } as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      domainService.createTemplate.mockResolvedValue({
        getUncommittedEvents: () => [],
      } as any);
      repository.saveTemplate.mockResolvedValue({
        code: 'TEST_TEMPLATE',
        version: 1,
        contentUrl:
          'https://custom-storage.blob.core.windows.net/private/tenant123/templates/email/invoice/TEST_TEMPLATE/v1.html',
      } as ITemplate);

      // Act
      const result = await useCase.execute(mockUser, baseProps);

      // Assert
      expect(result.contentUrl).toBe(
        'https://custom-storage.blob.core.windows.net/private/tenant123/templates/email/invoice/TEST_TEMPLATE/v1.html',
      );

      // Cleanup
      process.env.AZURE_STORAGE_CONTAINER_PATH = originalEnv;
    });
  });
});
