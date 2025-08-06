# Shared Event Processing

This module provides a common pattern for event deduplication across all notification services in the core-notification system.

## Overview

The Event Processing module solves the problem of duplicate event processing that can occur when services restart or when multiple instances are running. It provides a centralized way to track which events have been processed to prevent duplicates.

## Key Components

### ProcessedEventEntity

A TypeORM entity that tracks processed events with the following fields:

- `streamName`: The EventStore stream name (e.g., `$et-slack.message.created.v1`)
- `revision`: The EventStore revision number (stored as string for large bigint values)
- `serviceContext`: The service that processed the event (e.g., `slack-worker`, `email-service`)
- `processingStatus`: Current status (`processing`, `processed`, `failed`, `skipped`)
- `processedAt`: Timestamp when the event was processed

### ProcessedEventRepository

A repository that provides methods for:

- Event deduplication checking
- Atomic processing status management
- Service-specific convenience methods
- Statistics and monitoring
- Cleanup utilities

## Usage Examples

### Basic Usage

```typescript
import { ProcessedEventRepository } from 'src/shared/infrastructure/event-processing';

// Check if event was already processed
const isProcessed = await repository.isEventProcessed(
  streamName,
  revision,
  'slack-worker',
);

// Mark as processing (atomic operation)
await repository.markEventAsProcessing(streamName, revision, 'slack-worker');

// Update status after processing
await repository.updateEventStatus(
  streamName,
  revision,
  'slack-worker',
  'processed',
);
```

### Service-Specific Convenience Methods

```typescript
// Slack service methods
await repository.isSlackEventProcessed(streamName, revision);
await repository.markSlackEventAsProcessing(streamName, revision);
await repository.markSlackEventAsProcessed(streamName, revision, 'processed');

// Email service methods
await repository.isEmailEventProcessed(streamName, revision);
await repository.markEmailEventAsProcessing(streamName, revision);

// Teams service methods
await repository.isTeamsEventProcessed(streamName, revision);
await repository.markTeamsEventAsProcessing(streamName, revision);

// SMS service methods
await repository.isSmsEventProcessed(streamName, revision);
await repository.markSmsEventAsProcessing(streamName, revision);
```

## Module Integration

To use the event processing module in your service:

```typescript
import { EventProcessingModule } from 'src/shared/infrastructure/event-processing';

@Module({
  imports: [
    EventProcessingModule,
    // ... other imports
  ],
  // ... rest of module configuration
})
export class YourServiceModule {}
```

## Event Handler Pattern

The typical pattern for using this in an event handler:

```typescript
@Injectable()
export class YourEventHandler {
  constructor(
    private readonly processedEventRepository: ProcessedEventRepository,
  ) {}

  async handleEvent(eventData: any, meta: EventStoreMetaProps): Promise<void> {
    // Check if already processed
    const alreadyProcessed =
      await this.processedEventRepository.isSlackEventProcessed(
        meta.stream,
        meta.revision,
      );

    if (alreadyProcessed) {
      return; // Skip processing
    }

    // Mark as processing to prevent race conditions
    await this.processedEventRepository.markSlackEventAsProcessing(
      meta.stream,
      meta.revision,
    );

    try {
      // Process the event
      await this.doEventProcessing(eventData);

      // Mark as successfully processed
      await this.processedEventRepository.markSlackEventAsProcessed(
        meta.stream,
        meta.revision,
        'processed',
      );
    } catch (error) {
      // Mark as failed
      await this.processedEventRepository.markSlackEventAsProcessed(
        meta.stream,
        meta.revision,
        'failed',
      );
      throw error;
    }
  }
}
```

## Database Schema

The module creates a table `processed_events` with the following structure:

```sql
CREATE TABLE processed_events (
  streamName VARCHAR(500) NOT NULL,
  revision VARCHAR(50) NOT NULL,
  serviceContext VARCHAR(100) NOT NULL,
  processingStatus VARCHAR(50) NOT NULL,
  processedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (streamName, revision, serviceContext)
);
```

## Monitoring and Maintenance

### Statistics

Get processing statistics:

```typescript
// Overall stats
const stats = await repository.getProcessingStats();

// Service-specific stats
const slackStats = await repository.getProcessingStats('slack-worker');

// Stats by service
const allServiceStats = await repository.getProcessingStatsByService();
```

### Cleanup

Clean up old processed events:

```typescript
// Clean up events older than 30 days
const deletedCount = await repository.cleanupOldEvents(30);

// Clean up for specific service
const deletedCount = await repository.cleanupOldEvents(30, 'slack-worker');
```

## Benefits

1. **Prevents Duplicate Processing**: Ensures events are processed exactly once
2. **Service Isolation**: Each service can track its own processing state
3. **Race Condition Prevention**: Atomic operations prevent multiple processes from processing the same event
4. **Monitoring**: Built-in statistics and status tracking
5. **Maintenance**: Automated cleanup of old records
6. **Reusability**: Common pattern that can be used across all notification services

## Supported Services

- **Slack Worker** (`slack-worker`)
- **Email Service** (`email-service`)
- **Teams Service** (`teams-service`)
- **SMS Service** (`sms-service`)

New services can easily be added by following the same pattern and adding convenience methods if needed.
