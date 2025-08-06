/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IList, IListOption } from 'src/shared/domain/properties';
import { ListTemplateProps } from './list-template.model';
// generate-domain-properties-query
export enum ListTemplateOrderEnum {
  code = 'code',
  name = 'name',
}

export interface ListTemplatePropsOptions extends IListOption {
  readonly code?: string;
  readonly name?: string;
  orderBy?: ListTemplateOrderEnum;
}

export class TemplatePage extends IList<ListTemplateProps> {}
