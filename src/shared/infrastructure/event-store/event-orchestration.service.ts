/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DomainEvent, serializeDomainEvent } from 'src/shared/domain';
import { ILogger } from 'src/shared/logger';
import { EsdbEventStore } from './esdb-event-store';
import { EventStoreMetaProps } from './event-store.model';

@Injectable()
export class EventOrchestrationService {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly esdb: EsdbEventStore<any>,
  ) {}

  async appendDomainEventsToStream(
    stream: string,
    domainEvents: DomainEvent[],
    streamMetadata?: {
      context: string;
      aggregateType: string;
      version: string;
    },
  ): Promise<void> {
    if (domainEvents.length === 0) {
      this.logger.debug(
        { stream, eventCount: 0 },
        'No domain events to append - skipping',
      );
      return;
    }

    this.logger.debug(
      { stream, eventCount: domainEvents.length },
      `Appending ${domainEvents.length} domain events to stream in single batch`,
    );

    // Group events by type to handle mixed event types properly
    const eventsByType = new Map<string, DomainEvent[]>();

    for (const event of domainEvents) {
      const serialized = serializeDomainEvent(event);
      const eventType = serialized.type;

      if (!eventsByType.has(eventType)) {
        eventsByType.set(eventType, []);
      }
      eventsByType.get(eventType)!.push(event);
    }

    // Append events grouped by type to maintain EventStore consistency
    for (const [eventType, eventsOfType] of eventsByType) {
      const serializedEvents = eventsOfType.map((event) => {
        const serialized = serializeDomainEvent(event);

        // Create domain data with metadata for the infrastructure layer
        return {
          ...serialized.data,
          _domainMetadata: serialized.metadata, // Pass domain metadata separately
          _streamMetadata: streamMetadata, // Pass stream metadata from Repository
        };
      });

      // Append all events of this type as a single atomic operation
      await this.esdb.write({
        stream, // ✅ Complete stream name from Repository
        type: eventType,
        event: serializedEvents, // Pass all events of same type as array
      });

      this.logger.debug(
        { stream, eventType, eventCount: eventsOfType.length },
        `Successfully appended ${eventsOfType.length} events of type ${eventType}`,
      );
    }

    this.logger.debug(
      { stream, eventCount: domainEvents.length },
      `Successfully appended all ${domainEvents.length} domain events to stream`,
    );
  }

  async readDomainEventsFromStream<T extends DomainEvent>(
    stream: string,
  ): Promise<T[]> {
    const raw = await this.esdb.list<T>(stream);
    return this.deserializeEvents<T>(raw);
  }

  protected deserializeEvents<T>(events: any[]): T[] {
    return events as T[]; // You can delegate to a reusable EventDeserializer if needed
  }

  async setupProjection<T>(
    stream: string,
    handler: (event: T, meta: EventStoreMetaProps) => void,
  ): Promise<void> {
    const revision = await this.esdb.catchupStream(stream, {
      onEvent: handler,
    });
    this.esdb.subscribeToStream(stream, {
      fromSequence: revision,
      onEvent: handler,
    });
  }
}
