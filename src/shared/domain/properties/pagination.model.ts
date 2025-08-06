/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export abstract class IList<T> {
  data: T[];
  meta: IListMeta;
  constructor(data: T[], meta: IListMeta) {
    this.data = data;
    this.meta = meta;
  }
}

export abstract class IListMeta {
  abstract page: number;

  abstract size: number;

  abstract itemCount: number;

  abstract pageCount: number;

  abstract hasPreviousPage: boolean;

  abstract hasNextPage: boolean;
}

export class IListOption {
  order?: ListOrder = ListOrder.asc;
  size?: number;
  page?: number;
  take?: number;
}

export enum ListOrder {
  asc = 'asc',
  desc = 'desc',
}
