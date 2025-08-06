/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Subscription } from 'rxjs';
import { IUserToken } from 'src/shared/auth';

export interface IEventStore<T = any> {
  appendToStream(payload: {
    user: IUserToken;
    stream: string;
    key: string;
    type: string;
    event: Partial<T> | Partial<T[]>;
  }): Promise<void>;
  subscribeToStream<T>(
    stream: string,
    opts: StoreSubscriptionOptions<T>,
  ): Subscription;
  catchupStream<T>(
    stream: string,
    opts: StoreSubscriptionOptions<T>,
  ): Promise<bigint | undefined>;
  getStreamRevision(stream: string): Promise<bigint | null>;
}

export interface StoreSubscriptionOptions<T> {
  fromSequence?: bigint;
  onEvent: (evt: T, meta: EventStoreMetaProps) => void;
}

export interface EventStoreMetaProps {
  // stream: string;
  // tenant: string;
  // key: string;
  // type: string;
  // date: Date;
  // sequence: bigint;
  // revision: bigint | undefined;
  // isLive: boolean;
  // version?: string;

  occurredAt: Date;
  aggregateId: string;
  stream: string;
  eventType: string;
  userId: string;
  tenant: string;
  tenantId: string;
  username: string;
  correlationId?: string;
  causationId?: string;
  aggregateType: string;
  context: string;
  service: string;
  version?: number;
  revision: bigint | undefined;
}
