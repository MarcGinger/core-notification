/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { IsArray } from 'class-validator';
import { ListMetaResponse } from './list-meta.response';

export class ListDto<T> {
  @IsArray()
  readonly data: T[];

  readonly meta: ListMetaResponse;

  constructor(data: T[], meta: ListMetaResponse) {
    this.data = data;
    this.meta = meta;
  }
}
