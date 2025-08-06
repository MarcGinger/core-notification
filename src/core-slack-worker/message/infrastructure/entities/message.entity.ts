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
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MessageStatusEnum } from '../../domain/entities';

@Entity({ name: 'message', schema: 'core_slack_worker' })
export class MessageEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'varchar', length: 60 })
  tenantId: string;

  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'config_code', type: 'varchar', length: 20, nullable: false })
  configCode: string;

  @Column({ name: 'channel', type: 'varchar', length: 255, nullable: false })
  channel: string;

  @Column({
    name: 'template_code',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  templateCode?: string;

  @Column({ name: 'payload', type: 'json', nullable: true })
  payload?: Record<string, any>;

  @Column({ name: 'rendered_message', type: 'text', nullable: true })
  renderedMessage?: string;

  @Column({
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: MessageStatusEnum,
  })
  status: MessageStatusEnum;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
  failureReason?: string;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  correlationId?: string;

  @Column({ name: 'retry_count', type: 'int', default: 0, nullable: false })
  retryCount: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
