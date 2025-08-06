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
import { MessageModule } from '../message.module';

/**
 * Message Documentation
 * This module handles the Swagger documentation for messages
 * including digital messages, physical touchpoints, and API access methods.
 */
export class MessageDocumentation {
  static setup(app: INestApplication, port: string | number): void {
    const config = new DocumentBuilder()
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .setTitle('📱 Message Management API')
      .setDescription(
        `
## Module Documentation
Individual Slack message records that track the complete lifecycle of each message from creation to delivery. Provides audit trail and delivery status monitoring.
`,
      )
      .setVersion('1.0')
      .addTag('Messages', 'This is the Message module');

    // Add dynamic server configuration
    SwaggerConfigUtil.addServers(config, port);

    const document = SwaggerModule.createDocument(app, config.build(), {
      include: [MessageModule],
    });

    SwaggerModule.setup('api/docs/core-slack-worker/messages', app, document);
  }

  static getEndpoint(port: string | number): string {
    return `${SwaggerConfigUtil.getServerUrl(port)}/api/docs/core-slack-worker/messages`;
  }
}
