/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ITemplate } from '../entities';
import {
  TemplateDomainException,
  TemplateExceptionMessage,
} from '../exceptions';

export function templateEquals(
  a: ITemplate | undefined,
  b: ITemplate | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.transport === b.transport &&
    a.useCase === b.useCase &&
    a.version === b.version &&
    a.content === b.content &&
    a.contentUrl === b.contentUrl &&
    a.active === b.active
  );
}

export function validateTemplate(input: ITemplate | string): ITemplate {
  let obj: ITemplate;
  if (typeof input === 'string') {
    obj = { code: input } as ITemplate;
  } else {
    obj = { ...input };
  }
  if (obj.name === undefined || obj.name === null) {
    throw new TemplateDomainException(TemplateExceptionMessage.requiredName);
  }
  if (obj.transport === undefined || obj.transport === null) {
    throw new TemplateDomainException(
      TemplateExceptionMessage.requiredTransport,
    );
  }
  if (obj.useCase === undefined || obj.useCase === null) {
    throw new TemplateDomainException(TemplateExceptionMessage.requiredUseCase);
  }
  if (obj.content === undefined || obj.content === null) {
    throw new TemplateDomainException(TemplateExceptionMessage.requiredContent);
  }
  if (obj.contentUrl === undefined || obj.contentUrl === null) {
    throw new TemplateDomainException(
      TemplateExceptionMessage.requiredContentUrl,
    );
  }
  if (Array.isArray(obj.version) && obj.version.length === 0) {
    throw new TemplateDomainException(
      TemplateExceptionMessage.emptyVersionArray,
    );
  }
  // No relationships to normalize, return input as is
  return obj;
}

export function toTemplate(input: ITemplate | string): ITemplate {
  if (typeof input === 'string') {
    throw new TemplateDomainException(
      TemplateExceptionMessage.invalidInputTypeForConversion,
    );
  }
  const Template = { ...input };
  validateTemplate(Template);
  return Template;
}
