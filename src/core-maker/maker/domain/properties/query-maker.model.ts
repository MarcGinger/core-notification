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
import { ListMakerProps } from './list-maker.model';
// generate-domain-properties-query
export enum ListMakerOrderEnum {
  to = 'to',
}

export interface ListMakerPropsOptions extends IListOption {
  readonly to?: string;
  orderBy?: ListMakerOrderEnum;
}

export class MakerPage extends IList<ListMakerProps> {}
