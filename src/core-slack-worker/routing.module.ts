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
import { MessageModule } from './message/message.module';
/**
 * 🏦 Core slack worker Module Router
 *
 * This router organizes core slack worker API endpoints by specific business capabilities
 * within the modular monolith architecture. Each route group represents a distinct
 * business capability that could potentially be extracted as a microservice.
 */
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'core-slack-worker',
        children: [{ path: 'messages', module: MessageModule }],
      },
    ]),

    // Import all active modules with controllers
    MessageModule,
  ],
})
export class CoreSlackWorkerModuleRouter {}
