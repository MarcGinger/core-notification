# Event-Driven Slack Message Processing System

This system implements a complete event-driven architecture for processing Slack messages using BullMQ queues, EventStoreDB for audit trails, and SQL projections for real-time data access.

## 🏗️ Architecture Overview

```
[Service A] ─┬─► SlackMessageRequestedEvent
[Service B] ─┘

  ↓ (subscribed)
[core-slack-worker]
  ├── Load config & template
  ├── Validate + render
  ├── Save MessageEntity (status=pending)
  └── Queue delivery job (BullMQ)

  ↓
[Slack Web API]
  ├── Success → SentEvent
  └── Failure → FailedEvent / Retry

  ↓
[EventStoreDB] ← full audit trail
[SQL] ← status + payload
```

## 📋 Event Flow

| Event                        | Description                             | Trigger           |
| ---------------------------- | --------------------------------------- | ----------------- |
| `SlackMessageRequestedEvent` | External service requests Slack message | API call          |
| `SlackMessageQueuedEvent`    | Message validated and queued            | After validation  |
| `SlackMessageSentEvent`      | Successfully sent to Slack              | Slack API success |
| `SlackMessageFailedEvent`    | Delivery failed                         | Slack API failure |
| `SlackMessageRetriedEvent`   | Retry attempt triggered                 | After failure     |

## 🚀 Quick Start

### 1. Start the Application

```bash
npm run start:dev
```

### 2. Send a Slack Message Request

```bash
curl -X POST http://localhost:3000/core-slack-worker/messages/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "tenant": "acme-corp",
    "channel": "#general",
    "configCode": "default-slack",
    "templateCode": "welcome-message",
    "payload": {
      "userName": "John Doe",
      "userEmail": "john@acme-corp.com"
    }
  }'
```

### 3. Response

```json
{
  "correlationId": "uuid-12345-67890",
  "status": "accepted",
  "message": "Slack message request queued for processing"
}
```

## 🔧 API Endpoints

### Single Message Request

- **POST** `/core-slack-worker/messages/request`
- **Description**: Request a single Slack message
- **Response**: Returns correlation ID for tracking

### Bulk Message Request

- **POST** `/core-slack-worker/messages/request/bulk`
- **Description**: Request multiple Slack messages
- **Body**: Array of message requests
- **Response**: Returns array of correlation IDs

### Scheduled Message

- **POST** `/core-slack-worker/messages/schedule`
- **Description**: Schedule a message for future delivery
- **Body**: `{ request: {...}, scheduledAt: "ISO-date" }`

### Urgent Message

- **POST** `/core-slack-worker/messages/urgent`
- **Description**: Send high-priority message immediately
- **Response**: Message prioritized in queue

## 🛠️ Components

### Event Handlers

- `SlackMessageRequestedHandler` - Validates and queues messages
- `SlackMessageQueuedHandler` - Logs successful queuing
- `SlackMessageSentHandler` - Updates status on success
- `SlackMessageFailedHandler` - Handles failures and retries
- `SlackMessageRetriedHandler` - Logs retry attempts

### BullMQ Processor

- `SlackMessageProcessor` - Processes delivery jobs
- Handles Slack Web API integration
- Manages retry logic with exponential backoff
- Updates message status in real-time

### Services

- `SlackMessageRequestService` - Entry point for external requests
- `MessageProjectionManager` - Manages EventStore projections
- `MessageSqlProjection` - Maintains SQL projection

### Controllers

- `SlackMessageRequestController` - REST API endpoints
- `MessageController` - Message management endpoints

## 🔄 Queue Configuration

The system uses 4 specialized BullMQ queues:

| Queue             | Purpose                | Priority   | Retry Policy                    |
| ----------------- | ---------------------- | ---------- | ------------------------------- |
| `slack-message`   | Slack message delivery | High (10)  | 4 attempts, exponential backoff |
| `email`           | Email notifications    | Normal (5) | 5 attempts, exponential backoff |
| `notification`    | Push notifications     | Normal (5) | 3 attempts, fixed delay         |
| `data-processing` | Heavy computations     | Low (1)    | 2 attempts, long backoff        |

## 📊 Message Status Flow

```
PENDING → PROCESSING/RETRYING → SENT/FAILED
   ↓            ↓                   ↓
Queue Job → Slack API → Update Status
```

### Status Values

- `PENDING` - Message created, waiting for processing
- `RETRYING` - Delivery failed, retry in progress
- `SENT` - Successfully delivered to Slack
- `FAILED` - All retry attempts exhausted

## 🗄️ Data Storage

### EventStoreDB (Audit Trail)

- Complete event history
- Immutable audit log
- Event sourcing for full traceability

### SQL Database (Projections)

- Real-time message status
- Optimized for queries
- Synchronized with EventStore

### Redis (Queue State)

- Job queues and status
- Retry management
- Worker coordination

## 🔍 Monitoring

### Queue Statistics

```bash
# Check queue health
GET /health

# View queue metrics (if implemented)
GET /core-slack-worker/messages/stats
```

### Message Tracking

- Use `correlationId` to track message lifecycle
- Monitor EventStore for complete audit trail
- Check SQL database for current status

## ⚙️ Configuration

### Environment Variables

```env
# Redis Configuration (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=core-slack

# EventStore Configuration
EVENTSTORE_CONNECTION_STRING=esdb://localhost:2113
```

### Queue Priorities

- **CRITICAL (20)** - System alerts, urgent notifications
- **HIGH (10)** - Slack messages, real-time communication
- **NORMAL (5)** - Email, standard notifications
- **LOW (1)** - Background processing, analytics

## 🚨 Error Handling

### Automatic Retries

- Failed messages are automatically retried
- Exponential backoff prevents API overload
- Configurable max attempts per queue

### Failure Scenarios

1. **Slack API Down** - Messages queued until service recovers
2. **Invalid Channel** - Marked as failed, no retries
3. **Rate Limiting** - Automatic backoff and retry
4. **Network Issues** - Retry with exponential delay

### Dead Letter Queue

- Messages that exceed retry limits
- Manual intervention required
- Preserved for analysis

## 🔐 Security

### Authentication

- JWT Bearer tokens required
- Keycloak integration
- Role-based access control

### Authorization

- Tenant isolation
- Channel access validation
- Config code permissions

## 🧪 Testing

### Example Test Scenarios

1. **Basic Message Flow** - Send message, verify delivery
2. **Retry Logic** - Simulate failure, verify retry
3. **Bulk Processing** - Send multiple messages
4. **Scheduling** - Schedule future message
5. **Priority Handling** - Urgent vs normal messages

### Test Environment

```bash
# Start dependencies
docker-compose up -d redis eventstore postgres

# Run tests
npm test

# Integration tests
npm run test:e2e
```

## 📈 Scaling

### Horizontal Scaling

- Multiple worker instances
- Redis cluster for high availability
- Load balancer for API endpoints

### Vertical Scaling

- Increase worker concurrency
- Optimize database connections
- Tune queue batch sizes

### Monitoring Points

- Queue depth and processing time
- Success/failure rates
- API response times
- Database performance

## 🔧 Troubleshooting

### Common Issues

**Messages stuck in queue**

```bash
# Check Redis connection
redis-cli ping

# Check worker status
pm2 status

# Clear stuck jobs (development only)
npm run queue:clear
```

**High failure rate**

- Verify Slack bot token
- Check channel permissions
- Review rate limiting

**EventStore connection issues**

- Verify connection string
- Check EventStore logs
- Ensure proper authentication

## 📝 Development

### Adding New Event Types

1. Create event class in `domain/events/`
2. Add event handler in `application/event-handlers/`
3. Register in `message.module.ts`
4. Update projections if needed

### Extending Processors

1. Create new processor in `infrastructure/processors/`
2. Define job data interface
3. Add to BullMQ module registration
4. Implement job processing logic

### Custom Queues

1. Add queue name to `queue.constants.ts`
2. Create configuration in `BullMQConfigService`
3. Register in `BullMQModule`
4. Create processor for new queue

This system provides a robust, scalable foundation for event-driven Slack message processing with complete auditability and monitoring capabilities.
