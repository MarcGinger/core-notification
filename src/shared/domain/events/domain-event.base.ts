/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IUserToken } from 'src/shared/auth';

export abstract class DomainEvent {
  abstract readonly eventType: string;

  readonly occurredAt: string = new Date().toISOString();
  readonly userId: string;
  readonly tenant: string;
  readonly tenantId: string;
  readonly username: string;

  constructor(
    user: IUserToken,
    public readonly aggregateId: string,
  ) {
    this.userId = user.sub;
    this.tenantId = user.tenant_id ?? user.tenant ?? 'unknown';
    this.username = user.preferred_username ?? user.name ?? user.email;
    this.tenant = user.tenant ?? 'unknown';
  }
}
