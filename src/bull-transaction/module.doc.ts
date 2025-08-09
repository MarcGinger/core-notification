/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { SwaggerConfigUtil } from 'src/docs/swagger-config.util';
import { TransactionModule } from './transaction/transaction.module';
import { TransactionDocumentation } from './transaction/docs/transaction.doc';

/**
 * bull transaction example Module Documentation
 * This module handles the Swagger documentation for the comprehensive banking product platform
 * including all core banking capabilities and business modules.
 */
export class BullTransactionDocumentation {
  static setup(app: INestApplication, port: string | number): void {
    const config = new DocumentBuilder()
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .setTitle('bull transaction example Platform')
      .setDescription(
        `
        
## Linked Modules Documentation
| Module | Description | Documentation Link |
|------|-------------|-------------------|
| **🔄 Transactions** | This is the transaction module | [📖 View Docs](/api/docs/bull-transaction/transactions) |
## 🔩 \`core-slack\` Service

### 📘 Description

The \`core-slack\` service is a dedicated messaging microservice responsible for delivering messages to Slack channels or users across the platform. It supports dynamic message templating, multi-tenant configuration, message scheduling, delivery tracking, and retry handling. The service ensures auditability and traceability of every Slack message by persisting domain events in EventStoreDB and maintaining message records in SQL.

This service acts as the **Slack integration layer** for the platform and can be invoked by other services (e.g., workflows, notifications, alerts) to publish structured messages in a configurable, tenant-aware, and observable manner.

---

### 🌟 Core Responsibilities

* 🍿 **Tenant-Aware Configuration**: Centralized storage of Slack channel mappings and message settings per tenant and code.
* 🧠 **Template-Driven Messaging**: Dynamic rendering of Slack messages using reusable templates and JSON payloads.
* 📬 **Reliable Delivery**: Queued delivery of Slack messages with status tracking, retry logic, and failure reason logging.
* ⏱️ **Message Scheduling**: Optionally schedule Slack messages for future delivery.
* 📜 **Auditable Event Trail**: All message events are stored in EventStoreDB for full traceability and replayability.
* 🚦 **Delivery Monitoring**: Real-time and historical tracking of Slack message status, with optional Redis projections for fast access.

---

### 🚰 Backed by Three Data Layers

| Storage          | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| **SQL**          | Configurations, templates, and message records           |
| **Redis**        | Optional caching of configs, templates, and status       |
| **EventStoreDB** | Immutable log of all domain events for message lifecycle |

---

### 📆 Typical Workflow

1. A service issues a \`SendSlackMessageCommand\` with a tenant, config code, and payload.
2. The \`core-slack\` service:

   * Looks up the configuration and template
   * Validates and renders the message
   * Emits a \`SlackMessageRequestedEvent\`
3. A background worker (via BullMQ) delivers the message via Slack’s API.
4. The result is recorded via \`SlackMessageSentEvent\` or \`SlackMessageFailedEvent\`.
5. Message status is persisted in SQL, optionally cached in Redis, and visible in monitoring tools.

---

### 🧱 Use Cases

* Notify users of business events (e.g., "payment completed", "loan approved")
* Alert operations teams of anomalies or system errors
* Schedule customer engagement or compliance notifications
* Integrate with Slack bots or workflows downstream

`,
      )
      .setVersion('1.0')
      .addTag('Transactions', 'This is the transaction module');
    SwaggerConfigUtil.addServers(config, port);

    const document = SwaggerModule.createDocument(app, config.build(), {
      include: [TransactionModule],
    });

    SwaggerModule.setup('api/docs/bull-transaction', app, document);

    TransactionDocumentation.setup(app, port);
  }

  static getEndpoint(port: string | number): string {
    return `${SwaggerConfigUtil.getServerUrl(port)}/api/docs/bull-transaction`;
  }
}
