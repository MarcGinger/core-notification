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
import { TemplateModule } from '../template.module';

/**
 * Template Documentation
 * This module handles the Swagger documentation for templates
 * including digital templates, physical touchpoints, and API access methods.
 */
export class TemplateDocumentation {
  static setup(app: INestApplication, port: string | number): void {
    const config = new DocumentBuilder()
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .setTitle('📱 Template Management API')
      .setDescription(
        `
## Module Documentation
Core entity for managing message templates across all communication channels. Each template represents a reusable message format with versioning, payload validation, and content storage capabilities. Templates are categorized by transport mechanism and business use case to enable efficient retrieval and rendering.
`,
      )
      .setVersion('1.0')
      .addTag('Templates', 'This is the Template module');

    // Add dynamic server configuration
    SwaggerConfigUtil.addServers(config, port);

    const document = SwaggerModule.createDocument(app, config.build(), {
      include: [TemplateModule],
    });

    SwaggerModule.setup(
      'api/docs/core-template-manager/templates',
      app,
      document,
    );
  }

  static getEndpoint(port: string | number): string {
    return `${SwaggerConfigUtil.getServerUrl(port)}/api/docs/core-template-manager/templates`;
  }
}
