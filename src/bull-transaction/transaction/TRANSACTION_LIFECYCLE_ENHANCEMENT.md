# Transaction Aggregate Lifecycle Enhancement

## Overview

The Transaction aggregate has been enhanced with comprehensive lifecycle management, following the same pattern used in the MessageQueue aggregate. This provides robust state management, event sourcing, and business logic for transaction processing.

## Enhanced Features

### 🏗️ New Properties Added

- **status**: TransactionStatusEnum - Tracks the current transaction state
- **processedAt**: Date - When transaction was completed
- **failureReason**: string - Reason for failure (if any)
- **correlationId**: string - For tracking across systems
- **retryCount**: number - Number of retry attempts
- **priority**: number - Processing priority

### 📋 Transaction Status Lifecycle

```typescript
enum TransactionStatusEnum {
  CREATED = 'CREATED', // Initial state
  PENDING = 'PENDING', // Queued for processing
  PROCESSING = 'PROCESSING', // Currently being processed
  SUCCESS = 'SUCCESS', // Successfully completed
  FAILED = 'FAILED', // Permanently failed
  RETRYING = 'RETRYING', // Failed but retrying
  SCHEDULED = 'SCHEDULED', // Scheduled for future processing
  CANCELLED = 'CANCELLED', // Cancelled by user
}
```

### 🚀 New Business Methods

#### 1. **markAsCompleted()**

```typescript
transaction.markAsCompleted(user, { processingTime: 'PT2.5S' });
```

- Marks transaction as successfully processed
- Sets `processedAt` timestamp
- Emits `TransactionCompletedEvent`

#### 2. **markAsQueued()**

```typescript
transaction.markAsQueued(user, 'job-123', 10);
```

- Marks transaction as queued for processing
- Records job ID and priority
- Emits `TransactionQueuedEvent`

#### 3. **markAsFailed()**

```typescript
transaction.markAsFailed(user, 'Insufficient funds');
```

- Marks transaction as permanently failed
- Records failure reason
- Emits `TransactionFailedEvent`

#### 4. **markForRetry()**

```typescript
const nextRetry = new Date(Date.now() + 30000); // 30 seconds
transaction.markForRetry(user, 'Network timeout', nextRetry);
```

- Marks transaction for retry
- Increments retry count
- Schedules next retry attempt
- Emits `TransactionRetryingEvent`

#### 5. **reschedule()**

```typescript
const futureDate = new Date('2025-08-15T10:00:00Z');
transaction.reschedule(user, futureDate);
```

- Reschedules transaction for future processing
- Updates scheduled time
- Emits `TransactionScheduledEvent`

### 🎯 Enhanced Events

| Event                       | Description            | When Emitted        |
| --------------------------- | ---------------------- | ------------------- |
| `TransactionCreatedEvent`   | Transaction created    | On creation         |
| `TransactionQueuedEvent`    | Queued for processing  | When added to queue |
| `TransactionCompletedEvent` | Successfully processed | On completion       |
| `TransactionFailedEvent`    | Processing failed      | On failure          |
| `TransactionRetryingEvent`  | Marked for retry       | On retry schedule   |
| `TransactionScheduledEvent` | Scheduled for future   | On reschedule       |
| `TransactionUpdatedEvent`   | Generic update         | On field changes    |

### 🔧 Factory Methods

#### Standard Creation

```typescript
const transaction = Transaction.create(user, {
  id: TransactionIdentifier.create(),
  from: 'account-123',
  to: 'account-456',
  amount: 100.0,
  status: TransactionStatusEnum.CREATED,
  retryCount: 0,
});
```

#### Scheduled Creation

```typescript
const scheduledDate = new Date('2025-08-15T10:00:00Z');
const transaction = Transaction.createScheduled(user, props, scheduledDate);
```

## Integration Benefits

### 🔄 Event-Driven Architecture

- Rich domain events for each state transition
- Perfect integration with EventStore
- Enables event sourcing and replay capabilities

### 🛠️ Message Queue Integration

- Works seamlessly with the generic message queue system
- Supports automatic retry logic with exponential backoff
- Priority-based processing

### 📊 Monitoring & Observability

- Comprehensive state tracking
- Failure reason capture
- Retry count monitoring
- Processing time tracking

### 🔒 Business Rules Enforcement

- Proper state transition validation
- User context requirements
- Idempotent operations

## Usage Examples

### Processing Pipeline Integration

```typescript
// 1. Create transaction
const transaction = Transaction.create(user, transactionProps);

// 2. Queue for processing
transaction.markAsQueued(user, 'job-123', 10);

// 3. Process and complete
try {
  // ... processing logic
  transaction.markAsCompleted(user, { processingTime: 'PT1.2S' });
} catch (error) {
  // Handle failure with retry
  transaction.markForRetry(user, error.message, new Date(Date.now() + 30000));
}
```

### Scheduled Transaction

```typescript
// Create for future processing
const futureDate = new Date('2025-08-15T10:00:00Z');
const transaction = Transaction.createScheduled(user, props, futureDate);

// Later, reschedule if needed
const newDate = new Date('2025-08-16T14:00:00Z');
transaction.reschedule(user, newDate);
```

## Migration Notes

### Breaking Changes

- `ITransaction` interface now includes additional fields
- `TransactionProps` interface updated
- Constructor now requires `status` and `retryCount`

### Backward Compatibility

- Existing `Transaction.create()` method still works
- `fromEntity()` factory method handles legacy data
- Validation ensures required fields are present

## Next Steps

1. **Update Repository Layer** - Modify database schema to support new fields
2. **Enhance Application Services** - Use new lifecycle methods in use cases
3. **Update DTOs** - Include new fields in API responses
4. **Add Event Handlers** - Process new domain events
5. **Monitoring Integration** - Track transaction states and metrics

---

**Status**: ✅ Complete and Ready for Integration  
**Last Updated**: August 9, 2025  
**Version**: 2.0.0
