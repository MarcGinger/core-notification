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
import { DomainEvent } from 'src/shared/domain/events';
import { ITemplateEventData } from '../entities/template.model';

export abstract class TemplateDomainEvent extends DomainEvent {
  constructor(
    user: IUserToken,
    aggregateId: string,
    public readonly props: ITemplateEventData,
  ) {
    super(user, aggregateId);
  }
}
