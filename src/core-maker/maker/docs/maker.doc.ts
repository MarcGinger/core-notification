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
import { MakerModule } from '../maker.module';

/**
 * Maker Documentation
 * This module handles the Swagger documentation for makers
 * including digital makers, physical touchpoints, and API access methods.
 */
export class MakerDocumentation {
  static setup(app: INestApplication, port: string | number): void {
    const config = new DocumentBuilder()
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .setTitle('📱 Maker Management API')
      .setDescription(
        `
## Module Documentation
No description available
`,
      )
      .setVersion('1.0')
      .addTag('Makers', 'This is the Maker module');

    // Add dynamic server configuration
    SwaggerConfigUtil.addServers(config, port);

    const document = SwaggerModule.createDocument(app, config.build(), {
      include: [MakerModule],
    });

    SwaggerModule.setup('api/docs/core-maker/makers', app, document);
  }

  static getEndpoint(port: string | number): string {
    return `${SwaggerConfigUtil.getServerUrl(port)}/api/docs/core-maker/makers`;
  }
}
