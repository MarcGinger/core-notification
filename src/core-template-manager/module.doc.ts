/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { SwaggerConfigUtil } from 'src/docs/swagger-config.util';
import { TemplateModule } from './template/template.module';
import { TemplateDocumentation } from './template/docs/template.doc';

/**
 * core slack management Module Documentation
 * This module handles the Swagger documentation for the comprehensive banking product platform
 * including all core banking capabilities and business modules.
 */
export class CoreTemplateManagerDocumentation {
  static setup(app: INestApplication, port: string | number): void {
    const config = new DocumentBuilder()
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .setTitle('core slack management Platform')
      .setDescription(
        `
        
## Linked Modules Documentation
| Module | Description | Documentation Link |
|------|-------------|-------------------|
| **🔄 Templates** | This is the Template module | [📖 View Docs](/api/docs/core-template-manager/templates) |
### Service Name: \`core-template\`

The \`core-template\` service is a centralized, channel-agnostic, multi-tenant service responsible for managing all message templates used across the platform. It operates as an upstream component in the messaging ecosystem, decoupled from the specific delivery mechanisms such as Slack, Email, SMS, or Microsoft Teams.

Its core function is to provide a single source of truth for the definition, versioning, validation, and lifecycle of communication templates. These templates are categorized by both transport channel (e.g., email, slack) and business use case (e.g., invoice, statement, quote). Each template includes metadata, a payload schema for validation, and the rendered content stored in a blob storage layer.

The service emits domain events for template creation and updates to EventStoreDB, enabling full auditability and supporting downstream projections. These events are then used to populate Redis with lightweight, query-optimized metadata so that worker services can retrieve and render templates efficiently without direct API dependencies.

The \`core-template\` service ensures consistency, version control, and separation of concerns across the platform, enabling downstream services to remain stateless and focused solely on message delivery logic.

`,
      )
      .setVersion('1.0')
      .addTag('Templates', 'This is the Template module');
    SwaggerConfigUtil.addServers(config, port);

    const document = SwaggerModule.createDocument(app, config.build(), {
      include: [TemplateModule],
    });

    SwaggerModule.setup('api/docs/core-template-manager', app, document);

    TemplateDocumentation.setup(app, port);
  }

  static getEndpoint(port: string | number): string {
    return `${SwaggerConfigUtil.getServerUrl(port)}/api/docs/core-template-manager`;
  }
}
