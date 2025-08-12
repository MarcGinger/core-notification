/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export { SystemOperationsDocumentation } from './system-operations.doc';
export { ApiDocumentationHub } from './api-hub.doc';
export { ArchitectureDocumentation } from './architecture.doc';
export { SecurityDocumentation } from './security.doc';
export { StandardsDocumentation } from './standards.doc';
export { GettingStartedDocumentation } from './getting-started.doc';
export { TerminologyDocumentation } from './terminology.doc';
export { OverviewPostgreSQLDocumentation } from './overview-postgresql.doc';
export { OverviewRedisDocumentation } from './overview-redis.doc';
export { OverviewEventStoreDBDocumentation } from './overview-eventstore.doc';
export { OverviewKafkaDocumentation } from './overview-kafka.doc';

// Swagger configuration utilities
export { SwaggerConfigUtil } from './swagger-config.util';

// Documentation setup interface
export interface SwaggerDocumentationUrls {
  hub: string;
  system: string;
  architecture: string;
  security: string;
  standards: string;
  terminology: string;
  gettingStarted: string;
  coreMaker: string;
  coreSlackWorker: string;
  coreTemplateManager: string;
  bullTransaction: string;
}
