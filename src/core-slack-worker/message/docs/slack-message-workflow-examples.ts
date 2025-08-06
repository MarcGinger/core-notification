/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

/**
 * Example usage of the Slack Message Event-Driven System
 *
 * This file demonstrates how external services can trigger Slack messages
 * using the event-driven architecture with BullMQ queues.
 */

// Example 1: Basic Slack Message Request
const basicMessageExample = {
  method: 'POST',
  url: '/core-slack-worker/messages/request',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: {
    tenant: 'acme-corp',
    channel: '#general',
    configCode: 'default-slack',
    templateCode: 'welcome-message',
    payload: {
      userName: 'John Doe',
      userEmail: 'john@acme-corp.com',
      welcomeMessage: 'Welcome to the team!',
    },
  },
};

// Example 2: Urgent High-Priority Message
const urgentMessageExample = {
  method: 'POST',
  url: '/core-slack-worker/messages/urgent',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: {
    tenant: 'acme-corp',
    channel: '#alerts',
    configCode: 'alerts-slack',
    templateCode: 'system-alert',
    payload: {
      alertType: 'CRITICAL',
      service: 'payment-processor',
      message: 'Payment processing service is down',
      timestamp: new Date().toISOString(),
    },
  },
};

// Example 3: Scheduled Message
const scheduledMessageExample = {
  method: 'POST',
  url: '/core-slack-worker/messages/schedule',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: {
    request: {
      tenant: 'acme-corp',
      channel: '@john.doe',
      configCode: 'reminder-slack',
      templateCode: 'meeting-reminder',
      payload: {
        userName: 'John Doe',
        meetingTitle: 'Team Standup',
        meetingTime: '2025-08-02T09:00:00Z',
        meetingRoom: 'Conference Room A',
      },
    },
    scheduledAt: '2025-08-02T08:45:00Z', // 15 minutes before meeting
  },
};

// Example 4: Bulk Messages
const bulkMessagesExample = {
  method: 'POST',
  url: '/core-slack-worker/messages/request/bulk',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-jwt-token',
  },
  body: [
    {
      tenant: 'acme-corp',
      channel: '#announcements',
      configCode: 'announcement-slack',
      templateCode: 'company-update',
      payload: {
        updateType: 'New Features',
        features: ['Dark Mode', 'Better Search', 'Mobile App'],
        releaseDate: '2025-08-05',
      },
    },
    {
      tenant: 'acme-corp',
      channel: '#dev-team',
      configCode: 'dev-slack',
      templateCode: 'deployment-notification',
      payload: {
        service: 'user-service',
        version: 'v2.1.0',
        environment: 'production',
        deployer: 'CI/CD Pipeline',
      },
    },
  ],
};

/**
 * Event Flow Example:
 *
 * 1. External Service → POST /core-slack-worker/messages/request
 *    ↓
 * 2. SlackMessageRequestController.requestMessage()
 *    ↓
 * 3. SlackMessageRequestService.requestSlackMessage()
 *    ↓
 * 4. EventBus.publish(SlackMessageRequestedEvent)
 *    ↓
 * 5. SlackMessageRequestedHandler.handle()
 *    - Validates request
 *    - Loads config & template
 *    - Renders message
 *    - Saves MessageEntity (status=pending)
 *    - Queues BullMQ job
 *    - Publishes SlackMessageQueuedEvent
 *    ↓
 * 6. SlackMessageProcessor.process() [BullMQ Worker]
 *    - Updates status to processing/retrying
 *    - Calls Slack Web API
 *    - On Success: publishes SlackMessageSentEvent
 *    - On Failure: publishes SlackMessageFailedEvent
 *    ↓
 * 7. Event Handlers update MessageEntity and audit trail
 *
 * All events are stored in EventStoreDB for complete audit trail.
 * SQL projections provide real-time status and payload access.
 */

/**
 * Expected Response Examples:
 */

// Success Response for single message
const singleMessageResponse = {
  correlationId: 'uuid-12345-67890',
  status: 'accepted',
  message: 'Slack message request queued for processing',
};

// Success Response for bulk messages
const bulkMessageResponse = {
  correlationIds: ['uuid-12345-67890', 'uuid-abcde-fghij'],
  totalRequests: 2,
  status: 'accepted',
  message: 'Slack message requests queued for processing',
};

// Success Response for scheduled message
const scheduledMessageResponse = {
  correlationId: 'uuid-schedule-123',
  scheduledAt: '2025-08-02T08:45:00.000Z',
  status: 'scheduled',
  message: 'Slack message scheduled for future delivery',
};

// Success Response for urgent message
const urgentMessageResponse = {
  correlationId: 'uuid-urgent-456',
  priority: 'critical',
  status: 'accepted',
  message: 'Urgent Slack message request prioritized for processing',
};

/**
 * Environment Variables Required:
 *
 * # Redis Configuration (for BullMQ)
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 * REDIS_PASSWORD=
 * REDIS_DB=0
 *
 * # Slack Configuration
 * SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
 *
 * # Database Configuration
 * DB_HOST=localhost
 * DB_PORT=5432
 * DB_USERNAME=your-db-user
 * DB_PASSWORD=your-db-password
 * DB_DATABASE=core-slack
 *
 * # EventStore Configuration
 * EVENTSTORE_CONNECTION_STRING=esdb://localhost:2113
 */

export {
  basicMessageExample,
  urgentMessageExample,
  scheduledMessageExample,
  bulkMessagesExample,
  singleMessageResponse,
  bulkMessageResponse,
  scheduledMessageResponse,
  urgentMessageResponse,
};
