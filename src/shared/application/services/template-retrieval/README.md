# Generic Template Retrieval Service

This document explains how to use the generic template retrieval service that provides a clean abstraction for any template renderer to access templates managed by the core-template-manager.

## Overview

The generic template retrieval service allows any part of the application to retrieve templates without being tightly coupled to the core-template-manager implementation details. It provides:

- **Tenant isolation**: All template operations are scoped to the user's tenant
- **Type safety**: Strong TypeScript interfaces for all operations
- **Performance optimization**: Batch operations and efficient filtering
- **Error handling**: Graceful fallbacks and comprehensive logging
- **Transport filtering**: Get templates optimized for specific channels (email, SMS, Slack, etc.)

## Architecture

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│   Template Renderer     │    │  Generic Template       │    │  Core Template Manager  │
│   (Any Service)         │◄──►│  Retrieval Service      │◄──►│  (TemplateRepository)   │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
                                                                           │
                                                               ┌─────────────────────────┐
                                                               │  Redis/Blob Storage     │
                                                               │  (Template Data)        │
                                                               └─────────────────────────┘
```

## Usage

### 1. Import the Service

```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  ITemplateRetrievalService,
  TEMPLATE_RETRIEVAL_SERVICE,
} from 'src/shared/application/services';
```

### 2. Inject in Constructor

```typescript
@Injectable()
export class YourTemplateRenderer {
  constructor(
    @Inject(TEMPLATE_RETRIEVAL_SERVICE)
    private readonly templateRetrievalService: ITemplateRetrievalService,
  ) {}
}
```

### 3. Add Module Import

Add `CoreTemplateRetrievalModule` to your module's imports:

```typescript
import { CoreTemplateRetrievalModule } from 'src/shared/application/core-template-retrieval.module';

@Module({
  imports: [
    // ... other imports
    CoreTemplateRetrievalModule,
  ],
  // ... providers, controllers, etc.
})
export class YourModule {}
```

## API Reference

### ITemplateRetrievalService

#### getTemplate()

Retrieves a single template by code.

```typescript
async getTemplate(
  user: IUserToken,
  templateCode: string,
  options?: ITemplateRetrievalOptions,
): Promise<ITemplateContent | undefined>
```

**Example:**

```typescript
const template = await this.templateRetrievalService.getTemplate(
  user,
  'welcome-email',
  {
    transport: 'email',
    includeInactive: false,
  },
);
```

#### getTemplates()

Retrieves multiple templates in a single operation.

```typescript
async getTemplates(
  user: IUserToken,
  templateCodes: string[],
  options?: ITemplateRetrievalOptions,
): Promise<ITemplateContent[]>
```

**Example:**

```typescript
const templates = await this.templateRetrievalService.getTemplates(
  user,
  ['welcome-email', 'reminder-email', 'confirmation-email'],
  { transport: 'email' },
);
```

#### templateExists()

Checks if a template exists without loading its content.

```typescript
async templateExists(
  user: IUserToken,
  templateCode: string,
  options?: ITemplateRetrievalOptions,
): Promise<boolean>
```

#### getTemplateContent()

Gets only the template content (optimized for rendering).

```typescript
async getTemplateContent(
  user: IUserToken,
  templateCode: string,
  options?: ITemplateRetrievalOptions,
): Promise<string | undefined>
```

### ITemplateRetrievalOptions

Optional filtering and retrieval options:

```typescript
interface ITemplateRetrievalOptions {
  readonly includeInactive?: boolean; // Default: undefined (includes all)
  readonly version?: number; // Specific version
  readonly useCase?: string; // Filter by use case
  readonly transport?: string; // Filter by transport (email, sms, slack, etc.)
}
```

### ITemplateContent

The template data returned by the service:

```typescript
interface ITemplateContent {
  readonly code: string; // Template identifier
  readonly name: string; // Human-readable name
  readonly content: string; // Template content with placeholders
  readonly contentUrl: string; // URL to blob storage (if applicable)
  readonly version?: number; // Template version
  readonly active?: boolean; // Active status
  readonly payloadSchema?: Record<string, any>; // JSON schema for validation
}
```

## Real-World Examples

### Example 1: Email Template Renderer

```typescript
@Injectable()
export class EmailTemplateRenderer {
  constructor(
    @Inject(TEMPLATE_RETRIEVAL_SERVICE)
    private readonly templateRetrievalService: ITemplateRetrievalService,
  ) {}

  async renderEmail(
    user: IUserToken,
    templateCode: string,
    payload: Record<string, any>,
  ): Promise<string> {
    try {
      const template = await this.templateRetrievalService.getTemplate(
        user,
        templateCode,
        {
          transport: 'email',
          includeInactive: false,
        },
      );

      if (!template) {
        throw new Error(`Email template not found: ${templateCode}`);
      }

      return this.renderTemplate(template.content, payload);
    } catch (error) {
      this.logger.error(`Failed to render email template: ${error}`);
      return this.generateFallbackContent(payload);
    }
  }

  private renderTemplate(
    content: string,
    payload: Record<string, any>,
  ): string {
    let rendered = content;
    for (const [key, value] of Object.entries(payload)) {
      rendered = rendered.replace(
        new RegExp(`{{${key}}}`, 'g'),
        String(value ?? ''),
      );
    }
    return rendered;
  }
}
```

### Example 2: Multi-Channel Notification

```typescript
@Injectable()
export class NotificationService {
  constructor(
    @Inject(TEMPLATE_RETRIEVAL_SERVICE)
    private readonly templateRetrievalService: ITemplateRetrievalService,
  ) {}

  async sendMultiChannelNotification(
    user: IUserToken,
    templateCode: string,
    payload: Record<string, any>,
    channels: string[],
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(
      channels.map(async (channel) => {
        try {
          const template = await this.templateRetrievalService.getTemplate(
            user,
            templateCode,
            {
              transport: channel,
              includeInactive: false,
            },
          );

          if (template) {
            results[channel] = this.renderTemplate(template.content, payload);
          } else {
            results[channel] = `Template not found for ${channel}`;
          }
        } catch (error) {
          results[channel] = `Error: ${error}`;
        }
      }),
    );

    return results;
  }
}
```

### Example 3: Template Validation

```typescript
@Injectable()
export class TemplateValidationService {
  constructor(
    @Inject(TEMPLATE_RETRIEVAL_SERVICE)
    private readonly templateRetrievalService: ITemplateRetrievalService,
  ) {}

  async validateTemplateConfiguration(
    user: IUserToken,
    config: { templateCode: string; transport: string }[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    await Promise.all(
      config.map(async ({ templateCode, transport }) => {
        const exists = await this.templateRetrievalService.templateExists(
          user,
          templateCode,
          { transport, includeInactive: false },
        );

        if (!exists) {
          errors.push(
            `Template '${templateCode}' not found for transport '${transport}'`,
          );
        }
      }),
    );

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

## Best Practices

1. **Always handle template not found cases** - Provide fallback content or graceful error handling
2. **Use appropriate transport filters** - Filter by transport type for channel-specific templates
3. **Batch operations when possible** - Use `getTemplates()` for multiple templates
4. **Include comprehensive logging** - Log template retrieval for debugging and monitoring
5. **Cache rendered content when appropriate** - Consider caching for frequently used templates
6. **Validate payload against schema** - Use the `payloadSchema` field for validation if available

## Error Handling

The service is designed to be resilient:

- Returns `undefined` for templates that don't exist (not throwing errors)
- Provides comprehensive logging for troubleshooting
- Supports graceful degradation with fallback content
- Handles tenant isolation automatically

## Performance Considerations

- **Batch operations**: Use `getTemplates()` for multiple templates
- **Content-only retrieval**: Use `getTemplateContent()` when you only need the content
- **Existence checks**: Use `templateExists()` for lightweight validation
- **Transport filtering**: Apply filters to reduce data transfer and processing

## Integration with Existing Code

The generic service integrates seamlessly with existing template renderers:

1. Replace direct `TemplateRepository` usage with `ITemplateRetrievalService`
2. Add the `CoreTemplateRetrievalModule` to your module imports
3. Update injection tokens to use `TEMPLATE_RETRIEVAL_SERVICE`
4. Enjoy type-safe, tenant-aware template retrieval!
