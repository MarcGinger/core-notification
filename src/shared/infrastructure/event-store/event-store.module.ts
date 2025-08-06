/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { EsdbEventStore } from './esdb-event-store';
import { ILogger, LoggerModule } from 'src/shared/logger';

interface EventStoreModuleOptions {
  /** A unique injection token—for example 'USER_EVENTS_STREAM' */
  token: string;
  /** The name of the underlying stream */
  serviceName: string;
}

@Global()
@Module({
  imports: [LoggerModule],
})
export class EventStoreModule {
  static register<T = any>(opts: EventStoreModuleOptions): DynamicModule {
    const provider: Provider = {
      provide: opts.token,
      useFactory: (logger: ILogger) => {
        // Here you could swap in a real client (EventStoreDB, Kafka, etc.)
        return new EsdbEventStore<T>(opts.serviceName, logger);
      },
      inject: ['ILogger'],
    };

    return {
      module: EventStoreModule,
      imports: [LoggerModule],
      providers: [provider],
      exports: [provider],
    };
  }
}
