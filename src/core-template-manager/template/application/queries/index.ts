/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  TemplateContentHandler,
  TemplateItemHandler,
  TemplateListHandler,
} from './template-query.handler';

export const TemplateQuery = [
  TemplateItemHandler,
  TemplateListHandler,
  TemplateContentHandler,
];

export {
  ContentTemplateQuery,
  ItemTemplateQuery,
  ListTemplateQuery,
} from './template-query.class';
