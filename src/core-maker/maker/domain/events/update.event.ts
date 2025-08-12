/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { MakerDomainEvent } from './maker-domain.event';

export class MakerUpdatedEvent extends MakerDomainEvent {
  readonly eventType = 'maker.updated.v1';
}
