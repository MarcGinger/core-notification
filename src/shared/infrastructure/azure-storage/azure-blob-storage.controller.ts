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
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AzureBlobStorageService,
  BlobInfo,
} from './azure-blob-storage.service';

export class UploadFileDto {
  containerName: string;
  blobName?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  overwrite?: boolean;
}

export class GetBlobDto {
  containerName: string;
  blobName: string;
}

export class DeleteBlobDto {
  containerName: string;
  blobName: string;
  deleteSnapshots?: 'include' | 'only';
}

export class ListBlobsDto {
  containerName: string;
  prefix?: string;
  maxResults?: number;
}

@ApiTags('Azure Blob Storage')
@Controller('azure-storage')
export class AzureBlobStorageController {
  private readonly logger = new Logger(AzureBlobStorageController.name);

  constructor(
    private readonly azureBlobStorageService: AzureBlobStorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to Azure Blob Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        containerName: {
          type: 'string',
        },
        blobName: {
          type: 'string',
        },
        contentType: {
          type: 'string',
        },
        overwrite: {
          type: 'boolean',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ): Promise<BlobInfo> {
    try {
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      const blobName = uploadDto.blobName || file.originalname;
      const contentType = uploadDto.contentType || file.mimetype;

      const result = await this.azureBlobStorageService.uploadBlob({
        containerName: uploadDto.containerName,
        blobName,
        data: file.buffer,
        contentType,
        metadata: uploadDto.metadata,
        overwrite: uploadDto.overwrite,
      });

      this.logger.log(
        `File uploaded: ${blobName} to container: ${uploadDto.containerName}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Error uploading file', error);
      throw new HttpException(
        'Failed to upload file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload-text')
  @ApiOperation({ summary: 'Upload text content to Azure Blob Storage' })
  @ApiResponse({ status: 201, description: 'Text uploaded successfully' })
  async uploadText(
    @Body()
    body: {
      containerName: string;
      blobName: string;
      content: string;
      contentType?: string;
      metadata?: Record<string, string>;
    },
  ): Promise<BlobInfo> {
    try {
      const result = await this.azureBlobStorageService.uploadBlob({
        containerName: body.containerName,
        blobName: body.blobName,
        data: body.content,
        contentType: body.contentType || 'text/plain',
        metadata: body.metadata,
      });

      this.logger.log(
        `Text uploaded: ${body.blobName} to container: ${body.containerName}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Error uploading text', error);
      throw new HttpException(
        'Failed to upload text',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:containerName/:blobName')
  @ApiOperation({ summary: 'Download a blob from Azure Blob Storage' })
  @ApiResponse({ status: 200, description: 'Blob downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Blob not found' })
  async downloadBlob(
    @Param('containerName') containerName: string,
    @Param('blobName') blobName: string,
  ): Promise<{ content: string; info: BlobInfo }> {
    try {
      const result = await this.azureBlobStorageService.getBlob({
        containerName,
        blobName,
      });

      this.logger.log(
        `Blob downloaded: ${blobName} from container: ${containerName}`,
      );

      return {
        content: result.content.toString('base64'),
        info: result.info,
      };
    } catch (error) {
      this.logger.error('Error downloading blob', error);
      throw new HttpException('Failed to download blob', HttpStatus.NOT_FOUND);
    }
  }

  @Get('info/:containerName/:blobName')
  @ApiOperation({ summary: 'Get blob information without downloading content' })
  @ApiResponse({ status: 200, description: 'Blob info retrieved successfully' })
  async getBlobInfo(
    @Param('containerName') containerName: string,
    @Param('blobName') blobName: string,
  ): Promise<BlobInfo> {
    try {
      const info = await this.azureBlobStorageService.getBlobInfo({
        containerName,
        blobName,
      });

      this.logger.log(
        `Blob info retrieved: ${blobName} from container: ${containerName}`,
      );
      return info;
    } catch (error) {
      this.logger.error('Error getting blob info', error);
      throw new HttpException('Failed to get blob info', HttpStatus.NOT_FOUND);
    }
  }

  @Get('exists/:containerName/:blobName')
  @ApiOperation({ summary: 'Check if a blob exists' })
  @ApiResponse({ status: 200, description: 'Blob existence checked' })
  async blobExists(
    @Param('containerName') containerName: string,
    @Param('blobName') blobName: string,
  ): Promise<{ exists: boolean }> {
    try {
      const exists = await this.azureBlobStorageService.blobExists({
        containerName,
        blobName,
      });

      this.logger.log(
        `Blob existence checked: ${blobName} in container: ${containerName} - ${exists}`,
      );
      return { exists };
    } catch (error) {
      this.logger.error('Error checking blob existence', error);
      throw new HttpException(
        'Failed to check blob existence',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('list/:containerName')
  @ApiOperation({ summary: 'List blobs in a container' })
  @ApiResponse({ status: 200, description: 'Blobs listed successfully' })
  async listBlobs(
    @Param('containerName') containerName: string,
    @Query('prefix') prefix?: string,
    @Query('maxResults') maxResults?: number,
  ): Promise<BlobInfo[]> {
    try {
      const blobs = await this.azureBlobStorageService.listBlobs({
        containerName,
        prefix,
        maxResults,
      });

      this.logger.log(
        `Listed ${blobs.length} blobs from container: ${containerName}`,
      );
      return blobs;
    } catch (error) {
      this.logger.error('Error listing blobs', error);
      throw new HttpException(
        'Failed to list blobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('container/:containerName')
  @ApiOperation({ summary: 'Create a container' })
  @ApiResponse({ status: 201, description: 'Container created successfully' })
  async createContainer(
    @Param('containerName') containerName: string,
    @Body() body: { publicAccess?: 'blob' | 'container' },
  ): Promise<{ message: string }> {
    try {
      await this.azureBlobStorageService.createContainer(
        containerName,
        body.publicAccess,
      );

      this.logger.log(`Container created: ${containerName}`);
      return { message: `Container ${containerName} created successfully` };
    } catch (error) {
      this.logger.error('Error creating container', error);
      throw new HttpException(
        'Failed to create container',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('container/:containerName')
  @ApiOperation({ summary: 'Delete a container' })
  @ApiResponse({ status: 200, description: 'Container deleted successfully' })
  async deleteContainer(
    @Param('containerName') containerName: string,
  ): Promise<{ message: string }> {
    try {
      await this.azureBlobStorageService.deleteContainer(containerName);

      this.logger.log(`Container deleted: ${containerName}`);
      return { message: `Container ${containerName} deleted successfully` };
    } catch (error) {
      this.logger.error('Error deleting container', error);
      throw new HttpException(
        'Failed to delete container',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':containerName/:blobName')
  @ApiOperation({ summary: 'Delete a blob from Azure Blob Storage' })
  @ApiResponse({ status: 200, description: 'Blob deleted successfully' })
  async deleteBlob(
    @Param('containerName') containerName: string,
    @Param('blobName') blobName: string,
    @Query('deleteSnapshots') deleteSnapshots?: 'include' | 'only',
  ): Promise<{ message: string }> {
    try {
      await this.azureBlobStorageService.deleteBlob({
        containerName,
        blobName,
        deleteSnapshots,
      });

      this.logger.log(
        `Blob deleted: ${blobName} from container: ${containerName}`,
      );
      return { message: `Blob ${blobName} deleted successfully` };
    } catch (error) {
      this.logger.error('Error deleting blob', error);
      throw new HttpException(
        'Failed to delete blob',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sas-url/:containerName/:blobName')
  @ApiOperation({ summary: 'Generate a SAS URL for a blob' })
  @ApiResponse({ status: 200, description: 'SAS URL generated successfully' })
  async generateSasUrl(
    @Param('containerName') containerName: string,
    @Param('blobName') blobName: string,
    @Query('permissions') permissions: string = 'r',
    @Query('expiresInHours') expiresInHours: number = 1,
  ): Promise<{ sasUrl: string }> {
    try {
      const sasUrl = await this.azureBlobStorageService.generateBlobSasUrl(
        { containerName, blobName },
        permissions,
        expiresInHours,
      );

      this.logger.log(`SAS URL generated for blob: ${blobName}`);
      return { sasUrl };
    } catch (error) {
      this.logger.error('Error generating SAS URL', error);
      throw new HttpException(
        'Failed to generate SAS URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
