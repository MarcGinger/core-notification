# Azure Blob Storage Service

This service provides comprehensive Azure Blob Storage functionality for your NestJS application, including upload, download, delete, and management operations.

## Features

- ✅ Upload files (multipart/form-data or text content)
- ✅ Download files with metadata
- ✅ Delete files and containers
- ✅ List blobs with filtering
- ✅ Check blob existence
- ✅ Container management
- ✅ SAS URL generation
- ✅ Comprehensive error handling and logging
- ✅ TypeScript support with full type definitions

## Configuration

Make sure your `.env` file contains the Azure Storage connection string:

```env
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
```

## Usage

### Service Injection

```typescript
import { AzureBlobStorageService } from 'src/shared/infrastructure/azure-storage';

@Injectable()
export class YourService {
  constructor(
    private readonly azureBlobStorageService: AzureBlobStorageService,
  ) {}
}
```

### Upload Operations

#### Upload a file from buffer:

```typescript
const result = await this.azureBlobStorageService.uploadBlob({
  containerName: 'my-container',
  blobName: 'my-file.txt',
  data: Buffer.from('Hello World'),
  contentType: 'text/plain',
  metadata: { author: 'John Doe' },
  overwrite: true,
});
```

#### Upload text content:

```typescript
const result = await this.azureBlobStorageService.uploadBlob({
  containerName: 'documents',
  blobName: 'document.json',
  data: JSON.stringify({ message: 'Hello World' }),
  contentType: 'application/json',
});
```

### Download Operations

#### Download blob with content:

```typescript
const { content, info } = await this.azureBlobStorageService.getBlob({
  containerName: 'my-container',
  blobName: 'my-file.txt',
});

// Convert buffer to string if needed
const textContent = content.toString('utf-8');
```

#### Get blob metadata only:

```typescript
const blobInfo = await this.azureBlobStorageService.getBlobInfo({
  containerName: 'my-container',
  blobName: 'my-file.txt',
});

console.log('File size:', blobInfo.contentLength);
console.log('Last modified:', blobInfo.lastModified);
```

### Delete Operations

#### Delete a blob:

```typescript
await this.azureBlobStorageService.deleteBlob({
  containerName: 'my-container',
  blobName: 'my-file.txt',
  deleteSnapshots: 'include', // Optional
});
```

#### Delete a container:

```typescript
await this.azureBlobStorageService.deleteContainer('my-container');
```

### List and Search Operations

#### List all blobs in a container:

```typescript
const blobs = await this.azureBlobStorageService.listBlobs({
  containerName: 'my-container',
  maxResults: 100, // Optional
});
```

#### List blobs with prefix filter:

```typescript
const blobs = await this.azureBlobStorageService.listBlobs({
  containerName: 'my-container',
  prefix: 'documents/',
  maxResults: 50,
});
```

#### Check if blob exists:

```typescript
const exists = await this.azureBlobStorageService.blobExists({
  containerName: 'my-container',
  blobName: 'my-file.txt',
});
```

### Container Management

#### Create a container:

```typescript
await this.azureBlobStorageService.createContainer('my-new-container');

// Or with public access
await this.azureBlobStorageService.createContainer('public-container', 'blob');
```

### SAS URL Generation

#### Generate a temporary access URL:

```typescript
const sasUrl = await this.azureBlobStorageService.generateBlobSasUrl(
  {
    containerName: 'my-container',
    blobName: 'my-file.txt',
  },
  'r', // permissions: 'r' = read, 'w' = write, 'rw' = read+write
  24, // expires in 24 hours
);
```

## API Endpoints

The service also provides REST API endpoints for external access:

### File Upload

- `POST /azure-storage/upload` - Upload file (multipart/form-data)
- `POST /azure-storage/upload-text` - Upload text content

### File Download/Info

- `GET /azure-storage/download/:containerName/:blobName` - Download blob
- `GET /azure-storage/info/:containerName/:blobName` - Get blob metadata
- `GET /azure-storage/exists/:containerName/:blobName` - Check existence

### File Management

- `DELETE /azure-storage/:containerName/:blobName` - Delete blob
- `GET /azure-storage/list/:containerName` - List blobs
- `GET /azure-storage/sas-url/:containerName/:blobName` - Generate SAS URL

### Container Management

- `POST /azure-storage/container/:containerName` - Create container
- `DELETE /azure-storage/container/:containerName` - Delete container

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const result = await this.azureBlobStorageService.uploadBlob({
    containerName: 'my-container',
    blobName: 'my-file.txt',
    data: 'Hello World',
  });
} catch (error) {
  console.error('Upload failed:', error.message);
  // Handle specific Azure Storage errors
}
```

## Type Definitions

```typescript
interface BlobInfo {
  name: string;
  contentLength?: number;
  lastModified?: Date;
  contentType?: string;
  etag?: string;
  metadata?: Record<string, string>;
}

interface UploadBlobOptions {
  containerName: string;
  blobName: string;
  data: Buffer | Uint8Array | Blob | string | Readable;
  contentType?: string;
  metadata?: Record<string, string>;
  overwrite?: boolean;
}
```

## Security Considerations

1. **Connection String**: Keep your Azure Storage connection string secure and never commit it to version control
2. **SAS URLs**: Set appropriate expiration times and permissions for SAS URLs
3. **Container Access**: Be mindful of public access levels when creating containers
4. **Input Validation**: Always validate container and blob names before operations

## Testing

The service includes comprehensive unit tests. Run them with:

```bash
npm test azure-blob-storage.service.spec.ts
```

## Dependencies

- `@azure/storage-blob` - Azure Storage Blob SDK
- `@nestjs/common` - NestJS common utilities
- `@nestjs/config` - Configuration management
