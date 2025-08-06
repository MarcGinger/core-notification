/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  LogLevel,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { AppConfigUtil } from './shared/config';
import { PinoLogger } from './shared/logger';
import { AllExceptionFilter } from './shared/infrastructure/filters';
import { LoggingInterceptor } from './shared/infrastructure/interceptors';
import { DatabaseSchemaUtil } from './shared/infrastructure/database';
import { setupMultipleSwaggerDocs } from './docs';

async function bootstrap() {
  // Ensure database schema exists before creating the NestJS application
  await DatabaseSchemaUtil.ensureSchemas();

  const logger = new PinoLogger();
  const logLevel = AppConfigUtil.getLogLevel();
  const app = await NestFactory.create(AppModule, {
    logger: logLevel.length > 0 ? (logLevel as LogLevel[]) : [],
  });

  app.enableCors();

  // app.use(cookieParser());

  // Filter
  app.useGlobalFilters(new AllExceptionFilter(logger));

  // pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Enable URI versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // base routing
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [{ path: 'actuator', method: RequestMethod.GET }],
  });
  const port = AppConfigUtil.getPort('80');
  // swagger config
  if (!AppConfigUtil.isProduction()) {
    // Setup multiple Swagger documents
    setupMultipleSwaggerDocs(app, port);
  }

  // Log application startup with our enhanced logger
  logger.log(
    `Application is running on: ${AppConfigUtil.buildUrl(port, globalPrefix)}`,
    { component: 'Bootstrap' },
  );

  // Also log health metrics to demonstrate one of our enhanced logger features
  logger.logHealthMetrics();

  await app.listen(port);
}
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
});
