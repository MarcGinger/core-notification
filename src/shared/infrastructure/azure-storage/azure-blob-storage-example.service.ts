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
import { AzureBlobStorageService } from './azure-blob-storage.service';

/**
 * Example service demonstrating how to use AzureBlobStorageService
 */
@Injectable()
export class AzureBlobStorageExampleService {
  constructor(
    private readonly azureBlobStorageService: AzureBlobStorageService,
  ) {}

  /**
   * Example: Upload a text document
   */
  async uploadTextDocument(
    containerName: string,
    fileName: string,
    content: string,
  ) {
    return await this.azureBlobStorageService.uploadBlob({
      containerName,
      blobName: fileName,
      data: content,
      contentType: 'text/plain',
      metadata: {
        uploadedBy: 'system',
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Example: Upload a JSON document
   */
  async uploadJsonDocument(
    containerName: string,
    fileName: string,
    data: object,
  ) {
    return await this.azureBlobStorageService.uploadBlob({
      containerName,
      blobName: fileName,
      data: JSON.stringify(data, null, 2),
      contentType: 'application/json',
      metadata: {
        type: 'json-document',
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Example: Download and parse JSON document
   */
  async getJsonDocument<T = any>(
    containerName: string,
    fileName: string,
  ): Promise<T> {
    const { content } = await this.azureBlobStorageService.getBlob({
      containerName,
      blobName: fileName,
    });

    return JSON.parse(content.toString('utf-8')) as T;
  }

  /**
   * Example: Create a backup of data
   */
  async createBackup(containerName: string, data: any[]) {
    const backupFileName = `backup-${new Date().toISOString().split('T')[0]}.json`;

    return await this.uploadJsonDocument(containerName, backupFileName, {
      timestamp: new Date().toISOString(),
      recordCount: data.length,
      data,
    });
  }

  /**
   * Example: List all backup files
   */
  async listBackupFiles(containerName: string) {
    return await this.azureBlobStorageService.listBlobs({
      containerName,
      prefix: 'backup-',
      maxResults: 50,
    });
  }

  /**
   * Example: Generate temporary download link
   */
  async generateDownloadLink(
    containerName: string,
    fileName: string,
    expiresInHours: number = 1,
  ) {
    return await this.azureBlobStorageService.generateBlobSasUrl(
      { containerName, blobName: fileName },
      'r', // read-only permission
      expiresInHours,
    );
  }

  /**
   * Example: Clean up old files
   */
  async cleanupOldFiles(containerName: string, daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const blobs = await this.azureBlobStorageService.listBlobs({
      containerName,
    });

    const oldBlobs = blobs.filter(
      (blob) => blob.lastModified && blob.lastModified < cutoffDate,
    );

    const deletePromises = oldBlobs.map((blob) =>
      this.azureBlobStorageService.deleteBlob({
        containerName,
        blobName: blob.name,
      }),
    );

    await Promise.all(deletePromises);
    return oldBlobs.length;
  }

  /**
   * Example: Check if a file exists before uploading
   */
  async uploadIfNotExists(
    containerName: string,
    fileName: string,
    content: string,
  ) {
    const exists = await this.azureBlobStorageService.blobExists({
      containerName,
      blobName: fileName,
    });

    if (exists) {
      throw new Error(`File ${fileName} already exists`);
    }

    return await this.uploadTextDocument(containerName, fileName, content);
  }
}
