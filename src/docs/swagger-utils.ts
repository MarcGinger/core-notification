/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { INestApplication } from '@nestjs/common';
import { AppConfigUtil } from 'src/shared/config';
import { ApiDocumentationHub } from './api-hub.doc';
import { ArchitectureDocumentation } from './architecture.doc';
import { SecurityDocumentation } from './security.doc';
import { SwaggerDocumentationUrls } from './swagger.model';
import { StandardsDocumentation } from './standards.doc';
import { GettingStartedDocumentation } from './getting-started.doc';
import { TerminologyDocumentation } from './terminology.doc';
import { OverviewPostgreSQLDocumentation } from './overview-postgresql.doc';
import { OverviewRedisDocumentation } from './overview-redis.doc';
import { OverviewEventStoreDBDocumentation } from './overview-eventstore.doc';
import { OverviewKafkaDocumentation } from './overview-kafka.doc';
import { SystemOperationsDocumentation } from './system-operations.doc';
import { CoreSlackWorkerDocumentation } from 'src/core-slack-worker/module.doc';
import { CoreTemplateManagerDocumentation } from 'src/core-template-manager/module.doc';

/**
 * Setup multiple Swagger documentation using modular documentation classes
 */
export function setupMultipleSwaggerDocs(
  app: INestApplication,
  port: string | number,
): SwaggerDocumentationUrls {
  if (AppConfigUtil.isProduction()) {
    return {
      hub: '',
      system: '',
      architecture: '',
      security: '',
      terminology: '',
      standards: '',
      gettingStarted: '',
      coreSlackWorker: '',
      coreTemplateManager: '',
    };
  }

  // Setup consolidated documentation modules (groups multiple domains)
  SystemOperationsDocumentation.setup(app, port);
  ApiDocumentationHub.setup(app, port);
  ArchitectureDocumentation.setup(app, port);
  SecurityDocumentation.setup(app, port);
  StandardsDocumentation.setup(app, port);
  TerminologyDocumentation.setup(app, port);
  GettingStartedDocumentation.setup(app, port);
  OverviewPostgreSQLDocumentation.setup(app, port);
  OverviewRedisDocumentation.setup(app, port);
  OverviewEventStoreDBDocumentation.setup(app, port);
  OverviewKafkaDocumentation.setup(app, port);

  CoreSlackWorkerDocumentation.setup(app, port);
  CoreTemplateManagerDocumentation.setup(app, port);

  return {
    hub: ApiDocumentationHub.getEndpoint(port),
    system: SystemOperationsDocumentation.getEndpoint(port),
    architecture: ArchitectureDocumentation.getEndpoint(port),
    security: SecurityDocumentation.getEndpoint(port),
    standards: StandardsDocumentation.getEndpoint(port),
    terminology: TerminologyDocumentation.getEndpoint(port),
    gettingStarted: GettingStartedDocumentation.getEndpoint(port),

    coreSlackWorker: CoreSlackWorkerDocumentation.getEndpoint(port),
    coreTemplateManager: CoreTemplateManagerDocumentation.getEndpoint(port),
  };
}
