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
import { ListTransactionProps } from './list-transaction.model';
// generate-domain-properties-query
export enum ListTransactionOrderEnum {}

export interface ListTransactionPropsOptions extends IListOption {
  orderBy?: ListTransactionOrderEnum;
}

export class TransactionPage extends IList<ListTransactionProps> {}
