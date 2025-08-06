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
import { RouterModule } from '@nestjs/core';
import { TemplateModule } from './template/template.module';
/**
 * 🏦 Core slack management Module Router
 *
 * This router organizes core slack management API endpoints by specific business capabilities
 * within the modular monolith architecture. Each route group represents a distinct
 * business capability that could potentially be extracted as a microservice.
 */
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'core-template-manager',
        children: [{ path: 'templates', module: TemplateModule }],
      },
    ]),

    // Import all active modules with controllers
    TemplateModule,
  ],
})
export class CoreTemplateManagerModuleRouter {}
