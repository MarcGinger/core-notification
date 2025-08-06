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
import { CoreSlackWorkerModuleRouter } from './routing.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeormConfigService } from 'src/shared/infrastructure';
import { EntityModule } from './entities.module';
@Module({
  imports: [
    CoreSlackWorkerModuleRouter,
    TypeOrmModule.forRootAsync({ useClass: TypeormConfigService }),
    EntityModule,
  ],
})
export class CoreSlackWorkerModule {}
