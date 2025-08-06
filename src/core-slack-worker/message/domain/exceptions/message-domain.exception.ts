/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IException, DomainException } from 'src/shared/domain/exceptions';

/**
 * Domain exception for Message errors.
 * Carries a user-friendly message and an error code.
 */

export class MessageDomainException extends DomainException {
  constructor(exceptionMessage: IException) {
    super(exceptionMessage, 'Message');
  }
}
