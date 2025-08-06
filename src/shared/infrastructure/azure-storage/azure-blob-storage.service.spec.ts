/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AzureBlobStorageService } from './azure-blob-storage.service';

describe('AzureBlobStorageService', () => {
  let service: AzureBlobStorageService;

  const mockConfigService = {
    get: jest
      .fn()
      .mockReturnValue(
        'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureBlobStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AzureBlobStorageService>(AzureBlobStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if connection string is not configured', () => {
    const mockConfigServiceWithoutConnectionString = {
      get: jest.fn().mockReturnValue(undefined),
    };

    expect(() => {
      new AzureBlobStorageService(
        mockConfigServiceWithoutConnectionString as unknown as ConfigService,
      );
    }).toThrow('AZURE_STORAGE_CONNECTION_STRING is not configured');
  });

  describe('uploadBlob', () => {
    it('should have uploadBlob method', () => {
      expect(typeof service.uploadBlob).toBe('function');
    });
  });

  describe('getBlob', () => {
    it('should have getBlob method', () => {
      expect(typeof service.getBlob).toBe('function');
    });
  });

  describe('getBlobInfo', () => {
    it('should have getBlobInfo method', () => {
      expect(typeof service.getBlobInfo).toBe('function');
    });
  });

  describe('deleteBlob', () => {
    it('should have deleteBlob method', () => {
      expect(typeof service.deleteBlob).toBe('function');
    });
  });

  describe('blobExists', () => {
    it('should have blobExists method', () => {
      expect(typeof service.blobExists).toBe('function');
    });
  });

  describe('listBlobs', () => {
    it('should have listBlobs method', () => {
      expect(typeof service.listBlobs).toBe('function');
    });
  });

  describe('createContainer', () => {
    it('should have createContainer method', () => {
      expect(typeof service.createContainer).toBe('function');
    });
  });

  describe('deleteContainer', () => {
    it('should have deleteContainer method', () => {
      expect(typeof service.deleteContainer).toBe('function');
    });
  });

  describe('generateBlobSasUrl', () => {
    it('should have generateBlobSasUrl method', () => {
      expect(typeof service.generateBlobSasUrl).toBe('function');
    });
  });
});
