/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'check_point', schema: 'core_slack_worker' })
export class CheckPointEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'bigint' })
  revision: string;
}
