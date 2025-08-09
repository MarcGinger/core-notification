/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthGuard,
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
} from 'nest-keycloak-connect';
import { LoggerModule } from './shared/logger';
import { KeycloakConfigService } from './shared/infrastructure';
import { HealthModule } from './health/health.module';
import { CoreSlackWorkerModule } from './core-slack-worker/module';
import { CoreTemplateManagerModule } from './core-template-manager/module';
import { BullTransactionModule } from './bull-transaction/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    KeycloakConnectModule.registerAsync({
      useClass: KeycloakConfigService,
    }),
    LoggerModule,
    HealthModule,

    CoreSlackWorkerModule,
    CoreTemplateManagerModule,
    BullTransactionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AppModule {}
