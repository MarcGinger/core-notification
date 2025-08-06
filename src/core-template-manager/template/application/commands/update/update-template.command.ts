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
import { UpdateTemplateProps } from '../../../domain/properties';
export class UpdateTemplateCommand {
  constructor(
    public user: IUserToken,
    public readonly code: string,
    public readonly props: UpdateTemplateProps,
  ) {}
}
