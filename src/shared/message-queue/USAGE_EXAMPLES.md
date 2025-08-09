/\*\*

- Copyright (c) 2025 Marc Ginger. All rights reserved.
-
- This file is part of a proprietary NestJS system developed by Marc Ginger.
- Unauthorized copying, modification, distribution, or use of this file,
- via any medium, is strictly prohibited and may result in legal action.
-
- Confidential and proprietary.
  \*/

/\*\*

- GENERIC MESSAGE QUEUE SYSTEM - USAGE EXAMPLES
-
- This document demonstrates how to use the generic message queue system
- to handle different types of messages (Slack, Email, Notifications, Data Processing)
  \*/

// ===== EXAMPLE 1: SLACK MESSAGE =====
// The system automatically routes to SLACK_MESSAGE queue based on:
// - Stream name containing 'slack'
// - Payload with channel starting with '#' or '@'
// - messageType === 'slack'

const slackEventData = {
id: 'msg-123',
payload: {
channel: '#general',
templateCode: 'welcome-message',
renderedMessage: 'Welcome to the team!',
messageType: 'slack'
},
correlationId: 'corr-456',
priority: 5
};

// When this event is published to EventStore with stream name like 'slack-tenant1-message-123'
// The SlackMessageStrategy will handle it and route to SLACK_MESSAGE queue

// ===== EXAMPLE 2: EMAIL MESSAGE =====
// The system automatically routes to EMAIL queue based on:
// - Stream name containing 'email'
// - Payload with 'email' or 'to' field
// - messageType === 'email'

const emailEventData = {
id: 'email-789',
payload: {
to: 'user@example.com',
subject: 'Important Notification',
renderedMessage: 'Your account has been updated.',
messageType: 'email'
},
correlationId: 'corr-789',
priority: 3
};

// ===== EXAMPLE 3: NOTIFICATION MESSAGE =====
// The system automatically routes to NOTIFICATION queue based on:
// - Stream name containing 'notification'
// - messageType === 'notification'
// - Payload with 'notificationType' field

const notificationEventData = {
id: 'notif-456',
payload: {
userId: 'user-123',
notificationType: 'system-alert',
renderedMessage: 'Your subscription expires in 3 days',
messageType: 'notification'
},
correlationId: 'corr-notif-456',
priority: 8
};

// ===== EXAMPLE 4: DATA PROCESSING (FALLBACK) =====
// Any message that doesn't match other patterns goes to DATA_PROCESSING queue

const genericEventData = {
id: 'data-proc-789',
payload: {
dataType: 'analytics',
action: 'process-user-behavior',
metadata: { userId: 'user-456', sessionId: 'sess-789' }
},
correlationId: 'corr-data-789',
priority: 1
};

// ===== HOW THE ROUTING WORKS =====

/\*\*

- 1.  Event is published to EventStore
- 2.  MessageQueueEventSubscriptionManager receives the event
- 3.  MessageQueueEventHandler processes the event:
- - Validates event type
- - Extracts tenant information
- - Creates user context
- - Finds appropriate routing strategy
- - Routes to correct BullMQ queue
- 4.  BullMQ processors handle the job execution
      \*/

// ===== ROUTING STRATEGY PRIORITY ORDER =====
/\*\*

- 1.  SlackMessageStrategy - Handles Slack messages
- 2.  EmailMessageStrategy - Handles email messages
- 3.  NotificationStrategy - Handles notifications
- 4.  DataProcessingStrategy - Fallback for everything else
      \*/

// ===== QUEUE CONFIGURATION =====
/\*\*

- SLACK_MESSAGE queue: - Immediate processing, 3 attempts
- EMAIL queue: - Scheduled processing, 5 attempts
- NOTIFICATION queue: - Immediate processing, high priority
- DATA_PROCESSING queue: - Scheduled processing, low priority
  \*/

// ===== EXTENDING THE SYSTEM =====
/\*\*

- To add a new message type (e.g., SMS):
-
- 1.  Create SMSMessageStrategy implementing IMessageRoutingStrategy
- 2.  Add SMS queue to QUEUE_NAMES constant
- 3.  Register strategy in GenericMessageQueueModule
- 4.  Add strategy to MessageQueueEventHandler constructor
- 5.  Update getQueueByName method to include SMS queue
- 6.  Create SMS processor to handle jobs
      \*/

export const SMS_STRATEGY_EXAMPLE = `
@Injectable()
export class SMSMessageStrategy implements IMessageRoutingStrategy {
canHandle(eventData: UpdateMessageQueueProps, meta: EventStoreMetaProps): boolean {
return meta.stream?.includes('sms') ||
eventData.payload?.phoneNumber ||
eventData.payload?.messageType === 'sms';
}

getQueueName(): string {
return QUEUE_NAMES.SMS_MESSAGE;
}

getJobType(): string {
return 'send-sms';
}

getJobOptions(eventData: UpdateMessageQueueProps) {
return {
...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
priority: eventData.priority || QUEUE_PRIORITIES.HIGH,
};
}

transformData(eventData: UpdateMessageQueueProps, user: IUserToken): any {
return {
phoneNumber: eventData.payload?.phoneNumber,
message: eventData.payload?.renderedMessage,
tenant: user.tenant,
correlationId: eventData.correlationId,
};
}
}
`;

// ===== BENEFITS OF THIS APPROACH =====
/\*\*

- ✅ Generic - Handles any message type
- ✅ Extensible - Easy to add new message types
- ✅ Testable - Each strategy can be unit tested
- ✅ Maintainable - Clear separation of concerns
- ✅ Scalable - Different queues can have different processing patterns
- ✅ Reliable - Uses EventStore deduplication and BullMQ retry logic
- ✅ Observable - Comprehensive logging at each step
  \*/
