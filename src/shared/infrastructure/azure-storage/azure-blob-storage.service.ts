/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  BlobDownloadResponseParsed,
  BlobServiceClient,
  ContainerClient,
} from '@azure/storage-blob';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

export interface UploadBlobOptions {
  containerName: string;
  blobName: string;
  data: Buffer | Uint8Array | Blob | string | Readable;
  contentType?: string;
  metadata?: Record<string, string>;
  overwrite?: boolean;
}

export interface GetBlobOptions {
  containerName: string;
  blobName: string;
}

export interface DeleteBlobOptions {
  containerName: string;
  blobName: string;
  deleteSnapshots?: 'include' | 'only';
}

export interface ListBlobsOptions {
  containerName: string;
  prefix?: string;
  maxResults?: number;
}

export interface BlobInfo {
  name: string;
  contentLength?: number;
  lastModified?: Date;
  contentType?: string;
  etag?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class AzureBlobStorageService {
  private readonly logger = new Logger(AzureBlobStorageService.name);
  private readonly blobServiceClient: BlobServiceClient;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
    );

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }

    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    this.logger.log('Azure Blob Storage service initialized');
  }

  /**
   * Upload a blob to Azure Storage
   */
  async uploadBlob(options: UploadBlobOptions): Promise<BlobInfo> {
    try {
      const {
        containerName,
        blobName,
        data,
        contentType,
        metadata,
        overwrite = true,
      } = options;

      // Get container client
      const containerClient = this.getContainerClient(containerName);

      // Ensure container exists
      await this.ensureContainerExists(containerClient);

      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload options
      const uploadOptions = {
        blobHTTPHeaders: contentType
          ? { blobContentType: contentType }
          : undefined,
        metadata,
        overwrite,
      };

      // Upload the blob
      const uploadResult = await blockBlobClient.upload(
        data,
        this.getDataLength(data),
        uploadOptions,
      );

      this.logger.log(
        `Successfully uploaded blob: ${blobName} to container: ${containerName}`,
      );

      // Return blob info
      return {
        name: blobName,
        etag: uploadResult.etag,
        lastModified: uploadResult.lastModified,
        contentType,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to upload blob: ${options.blobName}`, error);
      throw error;
    }
  }

  /**
   * Get a blob from Azure Storage
   */
  async getBlob(options: GetBlobOptions): Promise<{
    content: Buffer;
    info: BlobInfo;
  }> {
    try {
      const { containerName, blobName } = options;

      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      // Download the blob
      const downloadResponse: BlobDownloadResponseParsed =
        await blobClient.download();

      // Convert readable stream to buffer
      const content = await this.streamToBuffer(
        downloadResponse.readableStreamBody!,
      );

      const info: BlobInfo = {
        name: blobName,
        contentLength: downloadResponse.contentLength,
        lastModified: downloadResponse.lastModified,
        contentType: downloadResponse.contentType,
        etag: downloadResponse.etag,
        metadata: downloadResponse.metadata,
      };

      this.logger.log(
        `Successfully retrieved blob: ${blobName} from container: ${containerName}`,
      );

      return { content, info };
    } catch (error) {
      this.logger.error(`Failed to get blob: ${options.blobName}`, error);
      throw error;
    }
  }

  /**
   * Get blob info without downloading the content
   */
  async getBlobInfo(options: GetBlobOptions): Promise<BlobInfo> {
    try {
      const { containerName, blobName } = options;

      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      // Get blob properties
      const properties = await blobClient.getProperties();

      const info: BlobInfo = {
        name: blobName,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified,
        contentType: properties.contentType,
        etag: properties.etag,
        metadata: properties.metadata,
      };

      this.logger.log(
        `Successfully retrieved blob info: ${blobName} from container: ${containerName}`,
      );

      return info;
    } catch (error) {
      this.logger.error(`Failed to get blob info: ${options.blobName}`, error);
      throw error;
    }
  }

  /**
   * Delete a blob from Azure Storage
   */
  async deleteBlob(options: DeleteBlobOptions): Promise<void> {
    try {
      const { containerName, blobName, deleteSnapshots } = options;

      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      // Delete the blob
      await blobClient.delete({
        deleteSnapshots: deleteSnapshots || 'include',
      });

      this.logger.log(
        `Successfully deleted blob: ${blobName} from container: ${containerName}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete blob: ${options.blobName}`, error);
      throw error;
    }
  }

  /**
   * Check if a blob exists
   */
  async blobExists(options: GetBlobOptions): Promise<boolean> {
    try {
      const { containerName, blobName } = options;

      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      return await blobClient.exists();
    } catch (error) {
      this.logger.error(
        `Failed to check blob existence: ${options.blobName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * List blobs in a container
   */
  async listBlobs(options: ListBlobsOptions): Promise<BlobInfo[]> {
    try {
      const { containerName, prefix, maxResults } = options;

      const containerClient = this.getContainerClient(containerName);

      const blobs: BlobInfo[] = [];
      const listOptions = {
        prefix,
        includeMetadata: true,
      };

      let count = 0;
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        if (maxResults && count >= maxResults) {
          break;
        }

        blobs.push({
          name: blob.name,
          contentLength: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          contentType: blob.properties.contentType,
          etag: blob.properties.etag,
          metadata: blob.metadata,
        });

        count++;
      }

      this.logger.log(
        `Successfully listed ${blobs.length} blobs from container: ${containerName}`,
      );

      return blobs;
    } catch (error) {
      this.logger.error(
        `Failed to list blobs in container: ${options.containerName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a container if it doesn't exist
   */
  async createContainer(
    containerName: string,
    publicAccess?: 'blob' | 'container',
  ): Promise<void> {
    try {
      const containerClient = this.getContainerClient(containerName);

      const createOptions = publicAccess ? { access: publicAccess } : undefined;
      await containerClient.createIfNotExists(createOptions);

      this.logger.log(`Container ensured: ${containerName}`);
    } catch (error) {
      this.logger.error(`Failed to create container: ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Delete a container
   */
  async deleteContainer(containerName: string): Promise<void> {
    try {
      const containerClient = this.getContainerClient(containerName);
      await containerClient.delete();

      this.logger.log(`Successfully deleted container: ${containerName}`);
    } catch (error) {
      this.logger.error(`Failed to delete container: ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Generate a SAS URL for a blob
   */
  async generateBlobSasUrl(
    options: GetBlobOptions,
    permissions: string = 'r',
    expiresInHours: number = 1,
  ): Promise<string> {
    try {
      const { containerName, blobName } = options;

      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      // Calculate expiry time
      const expiresOn = new Date();
      expiresOn.setHours(expiresOn.getHours() + expiresInHours);

      // Create BlobSASPermissions from string
      const { BlobSASPermissions } = await import('@azure/storage-blob');
      const sasPermissions = BlobSASPermissions.parse(permissions);

      // Generate SAS URL
      const sasUrl = await blobClient.generateSasUrl({
        permissions: sasPermissions,
        expiresOn,
      });

      this.logger.log(`Generated SAS URL for blob: ${blobName}`);

      return sasUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate SAS URL for blob: ${options.blobName}`,
        error,
      );
      throw error;
    }
  }

  // Private helper methods

  private getContainerClient(containerName: string): ContainerClient {
    return this.blobServiceClient.getContainerClient(containerName);
  }

  private async ensureContainerExists(
    containerClient: ContainerClient,
  ): Promise<void> {
    await containerClient.createIfNotExists();
  }

  private getDataLength(data: any): number {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    if (data instanceof Uint8Array) {
      return data.length;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    // For streams, length should be provided separately
    return 0;
  }

  private async streamToBuffer(
    readableStream: NodeJS.ReadableStream,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
}
