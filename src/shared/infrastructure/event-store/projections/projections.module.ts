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
import { LinkStoreProjection } from './link-store.projection';
import { LoggerModule } from 'src/shared/logger';

/**
 * Module for event stream projections.
 * Handles various read model projections for event streams.
 */
@Module({
  imports: [LoggerModule],
  providers: [LinkStoreProjection],
  exports: [LinkStoreProjection],
})
export class EventStoreProjectionsModule {}
