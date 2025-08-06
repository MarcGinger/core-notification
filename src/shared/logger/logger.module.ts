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
import { PinoLogger } from './logger.service';

@Module({
  providers: [
    // Make PinoLogger available for injection throughout the application
    PinoLogger,
    // Also provide it as a NestJS LoggerService using token
    {
      provide: 'ILogger',
      useClass: PinoLogger,
    },
  ],
  exports: ['ILogger'],
})
export class LoggerModule {}
