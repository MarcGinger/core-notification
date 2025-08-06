/\*\*

- Migration Guide: Moving to Shared Event Processing Repository
-
- This guide shows how to update the Slack worker to use the new shared
- ProcessedEventRepository instead of the service-specific one.
  \*/

// BEFORE: Service-specific import
// import { ProcessedEventRepository } from '../repositories/processed-event.repository';

// AFTER: Shared import
// import { ProcessedEventRepository } from 'src/shared/infrastructure/event-processing';

/\*\*

- Key Changes Required:
-
- 1.  Update imports in all files using ProcessedEventRepository
- 2.  Add serviceContext parameter to repository method calls
- 3.  Update module imports to use shared EventProcessingModule
- 4.  Optional: Use convenience methods for service-specific operations
      \*/

/\*\*

- Example Method Call Changes:
  \*/

// BEFORE:
// await this.processedEventRepository.isEventProcessed(streamName, revision);
// await this.processedEventRepository.markEventAsProcessing(streamName, revision);
// await this.processedEventRepository.markEventAsProcessed(streamName, revision, 'processed');

// AFTER (Option 1 - Explicit service context):
// await this.processedEventRepository.isEventProcessed(streamName, revision, 'slack-worker');
// await this.processedEventRepository.markEventAsProcessing(streamName, revision, 'slack-worker');
// await this.processedEventRepository.markEventAsProcessed(streamName, revision, 'slack-worker', 'processed');

// AFTER (Option 2 - Convenience methods):
// await this.processedEventRepository.isSlackEventProcessed(streamName, revision);
// await this.processedEventRepository.markSlackEventAsProcessing(streamName, revision);
// await this.processedEventRepository.markSlackEventAsProcessed(streamName, revision, 'processed');

/\*\*

- Module Update Required:
  \*/

// BEFORE: In message.module.ts
// imports: [
// TypeOrmModule.forFeature([ProcessedEventEntity]),
// // ... other imports
// ],
// providers: [
// ProcessedEventRepository,
// // ... other providers
// ],

// AFTER: In message.module.ts
// imports: [
// EventProcessingModule,
// // ... other imports
// ],
// providers: [
// // ProcessedEventRepository is now provided by EventProcessingModule
// // ... other providers
// ],
