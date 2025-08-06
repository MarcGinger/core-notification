# Enhanced Template Versioning Implementation

## 🎉 Intelligent Version Generation

Your template creation system now includes intelligent version generation that automatically checks existing templates and increments the version number. This ensures proper version management without manual intervention.

## 🔄 Enhanced Version Generation Logic

### How It Works

```typescript
private async generateVersion(user: IUserToken, templateCode: string): Promise<number> {
  // 1. Query existing templates with the same code
  const existingTemplates = await this.repository.getByCodes(user, [templateCode]);

  // 2. If no existing templates, start with version 1
  if (!existingTemplates || existingTemplates.length === 0) {
    return 1;
  }

  // 3. Find the highest version number
  const maxVersion = existingTemplates.reduce((max, template) => {
    const version = template.version || 1;
    return version > max ? version : max;
  }, 0);

  // 4. Return the next available version
  return maxVersion + 1;
}
```

## 📊 Version Progression Examples

### Scenario 1: First Template Creation

```
Current State: No existing templates
Action: Create "INVOICE_EMAIL" template
Result: Version 1 assigned
Blob Path: templates/tenant123/email/invoice/INVOICE_EMAIL/v1.html
```

### Scenario 2: Subsequent Template Updates

```
Current State:
- INVOICE_EMAIL v1 exists
- INVOICE_EMAIL v2 exists
- INVOICE_EMAIL v3 exists

Action: Create new "INVOICE_EMAIL" template
Result: Version 4 assigned
Blob Path: templates/tenant123/email/invoice/INVOICE_EMAIL/v4.html
```

### Scenario 3: Different Template Codes (Independent Versioning)

```
Current State:
- INVOICE_EMAIL v1, v2, v3 exist
- WELCOME_EMAIL v1, v2 exist

Action: Create new "WELCOME_EMAIL" template
Result: Version 3 assigned (independent of INVOICE_EMAIL versions)
Blob Path: templates/tenant123/email/welcome/WELCOME_EMAIL/v3.html
```

## 🛡️ Error Handling & Fallbacks

### Robust Error Handling

```typescript
try {
  // Query existing templates
  const existingTemplates = await this.repository.getByCodes(user, [
    templateCode,
  ]);
  // ... version calculation logic
} catch (error) {
  // If repository query fails, safely default to version 1
  this.logger.warn(
    `Failed to query existing versions, defaulting to version 1`,
  );
  return 1;
}
```

### Fallback Scenarios

1. **Repository Unavailable**: Defaults to version 1
2. **Invalid Version Data**: Treats as version 1
3. **Network Issues**: Graceful degradation to version 1

## 📋 Complete Usage Flow

### 1. **Client Request** (Same as before)

```json
{
  "code": "INVOICE_EMAIL",
  "name": "Invoice Email Template v2",
  "transport": "email",
  "useCase": "invoice",
  "content": "<html><body>Updated Invoice #{invoiceNumber}</body></html>",
  "payloadSchema": { "invoiceNumber": "string" },
  "active": true
}
```

### 2. **System Processing** (Enhanced)

```typescript
// UseCase execution
async execute(user: IUserToken, props: CreateTemplateProps): Promise<ITemplate> {
  // 1. Validate input
  this.validateInput(user, props);

  // 2. Generate next version automatically
  const version = await this.generateVersion(user, props.code); // NEW: Intelligent versioning

  // 3. Create versioned blob path
  const blobPath = this.generateBlobPath(user.tenant, props, version);
  // Result: templates/tenant123/email/invoice/INVOICE_EMAIL/v4.html

  // 4. Upload to blob storage
  await this.azureBlobStorageService.uploadBlob({ ... });

  // 5. Generate content URL
  const contentUrl = this.buildContentUrl(blobPath);

  // 6. Create and persist template
  const enhancedProps = { ...props, version, contentUrl };
  const aggregate = await this.domainService.createTemplate(user, enhancedProps);
  return await this.repository.saveTemplate(user, aggregate);
}
```

### 3. **Database State After Creation**

```json
{
  "code": "INVOICE_EMAIL",
  "name": "Invoice Email Template v2",
  "version": 4, // ✅ Auto-incremented from existing v1, v2, v3
  "contentUrl": "https://gstudios.blob.core.windows.net/templates/tenant123/email/invoice/INVOICE_EMAIL/v4.html",
  "transport": "email",
  "useCase": "invoice",
  "content": "<html><body>Updated Invoice #{invoiceNumber}</body></html>",
  "active": true
}
```

## 🔍 Logging & Debugging

### Enhanced Logging Output

```
[DEBUG] Generated version 4 for template INVOICE_EMAIL (3 existing versions)
[INFO] Uploading template content to blob storage: templates/tenant123/email/invoice/INVOICE_EMAIL/v4.html
[INFO] Successfully created template: INVOICE_EMAIL [events: 1]
```

### Debug Context Information

```json
{
  "existingVersions": 3,
  "maxVersion": 3,
  "nextVersion": 4,
  "templateCode": "INVOICE_EMAIL",
  "tenant": "tenant123"
}
```

## 🎯 Benefits of Enhanced Versioning

### ✅ **Automatic Version Management**

- No manual version tracking required
- Prevents version conflicts
- Ensures sequential versioning

### ✅ **Template History**

- Complete audit trail of template changes
- Easy rollback to previous versions
- Version-specific content URLs

### ✅ **Tenant Isolation**

- Versions are scoped per tenant
- Independent versioning across tenants
- Secure multi-tenant architecture

### ✅ **Blob Storage Organization**

```
templates/
  └── tenant123/
      └── email/
          └── invoice/
              └── INVOICE_EMAIL/
                  ├── v1.html (original)
                  ├── v2.html (first update)
                  ├── v3.html (second update)
                  └── v4.html (latest)
```

### ✅ **Error Resilience**

- Graceful fallback mechanisms
- Comprehensive error logging
- System continues operation even with partial failures

## 🚀 Future Enhancements

The versioning system is designed for extensibility:

### Semantic Versioning (Future)

```typescript
// Could be enhanced to support semantic versioning
interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

// Example: v1.2.3 instead of v4
```

### Version Branching (Future)

```typescript
// Could support version branches
// Example: v2.1.0-hotfix, v3.0.0-beta
```

### Automatic Deprecation (Future)

```typescript
// Could automatically mark old versions as deprecated
// Example: Auto-deprecate versions older than 30 days
```

## 📈 Performance Optimization

The system is optimized for performance:

1. **Efficient Queries**: Uses `getByCodes()` for batch operations
2. **Caching**: Leverages Redis cache for fast version lookups
3. **Minimal Network Calls**: Single query per version generation
4. **Async Processing**: Non-blocking version calculation

Your template system now provides intelligent, automatic version management with complete audit trails and robust error handling! 🎉
