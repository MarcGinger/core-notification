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
import { MakerStatusEnum } from '../../../domain/entities';

export class UpdateMakerStatusCommand {
  constructor(
    public user: IUserToken,
    public readonly id: string,
    public readonly status: MakerStatusEnum,
  ) {}
}
