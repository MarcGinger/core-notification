# Template Creation with Azure Blob Storage Integration

## 🎉 Successfully Integrated Azure Blob Storage into Template Creation Flow!

Your template creation system has been enhanced to automatically upload template content to Azure Blob Storage and generate content URLs. The `contentUrl` and `version` fields are now automatically generated and no longer need to be provided by the client.

## 📦 Architecture Flow Implementation

### Client → Handler → UseCase → DomainService → Aggregate → Repository

```
Client Request
    ↓
CreateTemplateHandler (orchestration)
    ↓
CreateTemplateUseCase
    ├── Generate version (v1, v2, etc.)
    ├── Upload content to Azure Blob Storage
    ├── Generate contentUrl from blob path
    └── Create enhanced props
    ↓
TemplateDomainService (business logic)
    ↓
Template Aggregate (domain rules & events)
    ↓
TemplateRepository
    ├── Save to EventStoreDB
    └── Update Redis cache
```

## 🔄 Enhanced Data Flow

### 1. **Input (Client)**

```json
{
  "code": "INVOICE_EMAIL_TEMPLATE",
  "name": "Invoice Email Template",
  "description": "Template for sending invoice emails",
  "transport": "email",
  "useCase": "invoice",
  "content": "<html><body>Invoice #{invoiceNumber}</body></html>",
  "payloadSchema": {
    "invoiceNumber": "string",
    "amount": "number"
  },
  "active": true
}
```

### 2. **Generated Fields (UseCase)**

- **Version**: `1` (auto-generated)
- **Blob Path**: `templates/{tenant}/email/invoice/INVOICE_EMAIL_TEMPLATE/v1.html`
- **Content URL**: `https://gstudios.blob.core.windows.net/templates/{tenant}/email/invoice/INVOICE_EMAIL_TEMPLATE/v1.html`

### 3. **Azure Blob Storage Metadata**

```json
{
  "tenant": "customer123",
  "templateCode": "INVOICE_EMAIL_TEMPLATE",
  "version": "1",
  "transport": "email",
  "useCase": "invoice",
  "uploadedBy": "john.doe",
  "uploadedAt": "2025-08-05T10:30:00Z"
}
```

### 4. **Final Template Entity**

```json
{
  "code": "INVOICE_EMAIL_TEMPLATE",
  "name": "Invoice Email Template",
  "description": "Template for sending invoice emails",
  "transport": "email",
  "useCase": "invoice",
  "version": 1,
  "content": "<html><body>Invoice #{invoiceNumber}</body></html>",
  "contentUrl": "https://gstudios.blob.core.windows.net/templates/customer123/email/invoice/INVOICE_EMAIL_TEMPLATE/v1.html",
  "payloadSchema": {
    "invoiceNumber": "string",
    "amount": "number"
  },
  "active": true
}
```

## 🏗️ Updated Components

### 1. **CreateTemplateProps** (Simplified)

```typescript
export interface CreateTemplateProps {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly transport: TemplateTransportEnum;
  readonly useCase: TemplateUseCaseEnum;
  readonly content: string;
  readonly payloadSchema: Record<string, any>;
  readonly active?: boolean;
  // ❌ Removed: version, contentUrl (auto-generated)
}
```

### 2. **CreateTemplateUseCase** (Enhanced)

```typescript
class CreateTemplateUseCase {
  constructor(
    private readonly repository: TemplateRepository,
    private readonly domainService: TemplateDomainService,
    private readonly azureBlobStorageService: AzureBlobStorageService, // ✅ Added
  ) {}

  async execute(
    user: IUserToken,
    props: CreateTemplateProps,
  ): Promise<ITemplate> {
    // 1. Generate version
    const version = this.generateVersion();

    // 2. Create blob path: templates/{tenant}/{transport}/{useCase}/{code}/v{version}.{ext}
    const blobPath = this.generateBlobPath(user.tenant, props, version);

    // 3. Upload to Azure Blob Storage
    await this.azureBlobStorageService.uploadBlob({
      containerName: 'templates',
      blobName: blobPath,
      data: props.content,
      contentType: this.getContentType(props.transport),
      metadata: {
        /* tenant, version, etc. */
      },
    });

    // 4. Generate content URL
    const contentUrl = this.buildContentUrl(blobPath);

    // 5. Create enhanced props
    const enhancedProps: EnhancedCreateTemplateProps = {
      ...props,
      version,
      contentUrl,
    };

    // 6. Delegate to domain service
    const aggregate = await this.domainService.createTemplate(
      user,
      enhancedProps,
    );

    // 7. Persist via repository
    return await this.repository.saveTemplate(user, aggregate);
  }
}
```

### 3. **TemplateDomainService** (Updated)

```typescript
class TemplateDomainService {
  async createTemplate(
    user: IUserToken,
    createData: EnhancedCreateTemplateProps, // ✅ Updated to use enhanced props
  ): Promise<Template> {
    const template = Template.create(user, {
      code: TemplateIdentifier.fromString(createData.code),
      name: createData.name,
      description: createData.description,
      transport: createData.transport,
      useCase: createData.useCase,
      version: createData.version, // ✅ Now available
      content: createData.content,
      contentUrl: createData.contentUrl, // ✅ Now available
      payloadSchema: createData.payloadSchema,
      active: createData.active,
    });

    return Promise.resolve(template);
  }
}
```

## 🎯 Blob Storage Naming Convention

Templates are stored using a hierarchical path structure:

```
templates/
  └── {tenant}/
      └── {transport}/
          └── {useCase}/
              └── {templateCode}/
                  ├── v1.html
                  ├── v2.html
                  └── v3.json
```

**Examples:**

- Email invoice template: `templates/customer123/email/invoice/INVOICE_TEMPLATE/v1.html`
- SMS notification: `templates/customer123/sms/notification/SMS_ALERT/v1.txt`
- Slack message: `templates/customer123/slack/alert/SLACK_ALERT/v1.json`

## 🔧 Content Type Mapping

| Transport | File Extension | Content Type       |
| --------- | -------------- | ------------------ |
| `email`   | `.html`        | `text/html`        |
| `sms`     | `.txt`         | `text/plain`       |
| `push`    | `.json`        | `application/json` |
| `slack`   | `.json`        | `application/json` |

## 🛡️ Benefits

1. **✅ Separation of Concerns**: Content storage separated from metadata
2. **✅ Scalability**: Large templates don't bloat database/events
3. **✅ Versioning**: Automatic version management with blob path organization
4. **✅ Audit Trail**: Full metadata tracking in EventStoreDB
5. **✅ Performance**: Fast reads from Redis cache, content from CDN
6. **✅ Security**: Blob storage with proper access controls
7. **✅ Simplified Client**: No need to manage versions or URLs

## 🚀 Usage Example

```typescript
// Client code (much simpler now!)
const createCommand = new CreateTemplateCommand(user, {
  code: 'WELCOME_EMAIL',
  name: 'Welcome Email Template',
  transport: TemplateTransportEnum.EMAIL,
  useCase: TemplateUseCaseEnum.WELCOME,
  content: '<html><body>Welcome {{firstName}}!</body></html>',
  payloadSchema: { firstName: 'string' },
  active: true,
});

// No need to manage version or contentUrl anymore!
const template = await commandBus.execute(createCommand);

console.log(template.version); // 1 (auto-generated)
console.log(template.contentUrl); // https://gstudios.blob.core.windows.net/templates/.../v1.html
```

## 🔍 What Changed

### ❌ Removed from Client

- `version` field (auto-generated)
- `contentUrl` field (auto-generated from blob upload)

### ✅ Added to System

- Azure Blob Storage integration
- Automatic version generation
- Hierarchical blob path structure
- Content type detection
- Enhanced metadata tracking
- Simplified client interface

Your template creation system is now production-ready with proper content management and automatic URL generation! 🎉
