/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { DomainException, IException } from 'src/shared/domain/exceptions';

/**
 * Domain exception for MessageQueue errors.
 * Carries a user-friendly message and an error code.
 */

export class MessageQueueDomainException extends DomainException {
  constructor(exceptionMessageQueue: IException) {
    super(exceptionMessageQueue, 'MessageQueue');
  }
}
