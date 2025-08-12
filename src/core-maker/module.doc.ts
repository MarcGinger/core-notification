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
import { MakerModule } from './maker/maker.module';
import { MakerDocumentation } from './maker/docs/maker.doc';

/**
 * core object maker Module Documentation
 * This module handles the Swagger documentation for the comprehensive banking product platform
 * including all core banking capabilities and business modules.
 */
export class CoreMakerDocumentation {
  static setup(app: INestApplication, port: string | number): void {
    const config = new DocumentBuilder()
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .setTitle('core object maker Platform')
      .setDescription(
        `
        
## Linked Modules Documentation
| Module | Description | Documentation Link |
|------|-------------|-------------------|
| **🔄 Makers** | This is the Maker module | [📖 View Docs](/api/docs/core-maker/makers) |
No description available
`,
      )
      .setVersion('1.0')
      .addTag('Makers', 'This is the Maker module');
    SwaggerConfigUtil.addServers(config, port);

    const document = SwaggerModule.createDocument(app, config.build(), {
      include: [MakerModule],
    });

    SwaggerModule.setup('api/docs/core-maker', app, document);

    MakerDocumentation.setup(app, port);
  }

  static getEndpoint(port: string | number): string {
    return `${SwaggerConfigUtil.getServerUrl(port)}/api/docs/core-maker`;
  }
}
