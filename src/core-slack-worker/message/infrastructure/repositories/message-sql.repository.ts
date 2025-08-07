/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ILogger } from 'src/shared/logger';
import { IUserToken } from 'src/shared/auth';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMessage } from '../../domain/entities';
import {
  MessageDomainException,
  MessageExceptionMessage,
} from '../../domain/exceptions';
import { IEvent } from '@nestjs/cqrs';
import { Message } from '../../domain/aggregates';
import { MessageCreatedEvent } from '../../domain/events';
import { DomainCommandRepository } from 'src/shared/infrastructure/repositories';
import { CoreSlackWorkerLoggingHelper } from '../../../shared/domain/value-objects';

import { MessageEntity } from '../entities';
import { DataSource, Repository } from 'typeorm';

const COMPONENT_NAME = 'MessageSqlRepository';

export class MessageSqlRepository extends DomainCommandRepository<
  IMessage,
  Message,
  typeof MessageExceptionMessage
> {
  protected sendSlackMessageRepository: Repository<MessageEntity>;
  constructor(
    protected readonly configService: ConfigService,
    @Inject('ILogger') protected readonly logger: ILogger,
    protected readonly dataSource: DataSource,
  ) {
    super(configService, logger, MessageExceptionMessage, Message);
    this.sendSlackMessageRepository = dataSource.getRepository(MessageEntity);
  }

  protected getCreateEvent(user: IUserToken, aggregate: Message): IEvent {
    return new MessageCreatedEvent(user, aggregate.getId(), aggregate.toDto());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getUpdateEvent(user: IUserToken, aggregate: Message): IEvent {
    throw new MessageDomainException(MessageExceptionMessage.notImplemented);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getDeleteEvent(user: IUserToken, aggregate: Message): IEvent {
    throw new MessageDomainException(MessageExceptionMessage.notImplemented);
  }

  protected async get(user: IUserToken, id: string): Promise<IMessage> {
    const tenantId = user.tenant;
    const logContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'get',
      id,
      user,
    );
    this.logger.debug(logContext, `Getting sendSlackMessage by id: ${id}`);

    try {
      const entity = await this.sendSlackMessageRepository.findOneOrFail({
        where: { id, tenantId },
        select: {
          id: true,
          channel: true,
          configCode: true,
          templateCode: true,
          payload: true,
          scheduledAt: true,
          correlationId: true,
          status: true,
          retryCount: true,
          createdAt: true,
          updatedAt: true,
        },

        relations: {},
      });

      // Use the helper method for hydration
      const sendSlackMessage = this.hydrateMessageEntity(
        user,
        entity,
        logContext,
      );

      this.logger.debug(
        logContext,
        `Successfully retrieved sendSlackMessage: ${id}`,
      );
      return sendSlackMessage;
    } catch (e) {
      this.logger.error(
        {
          ...logContext,
          id,
          tenantId,
          username: user?.preferred_username,
          error: e instanceof Error ? e.message : 'Unknown error',
        },
        'Message get error',
      );

      if (e instanceof MessageDomainException) {
        throw e;
      }

      throw new MessageDomainException(MessageExceptionMessage.notFound);
    }
  }

  async getMessage(user: IUserToken, code: string): Promise<IMessage> {
    const result = await this.get(user, code);
    if (!result) {
      throw new MessageDomainException(MessageExceptionMessage.notFound);
    }
    return result;
  }

  /**
   * ✅ CLEAN: Repository delegates aggregate creation to domain factory
   * No knowledge of internal domain structure required
   */
  protected createAggregate(user: IUserToken, entity: IMessage): Message {
    return Message.fromEntity(entity);
  }

  // This is the implementation that overrides the abstract method in the base class
  // to handle the specific IMessage to IMessageStream conversion

  protected async save(user: IUserToken, data: Message): Promise<IMessage> {
    if (!user) {
      throw new MessageDomainException(
        MessageExceptionMessage.userRequiredForOperation,
      );
    }
    if (!data || !data.id) {
      throw new MessageDomainException(
        MessageExceptionMessage.invalidDataForOperation,
      );
    }

    const tenantId = user.tenant;
    const sendSlackMessageId = data.id.value; // Convert MessageIdentifier to string
    const logContext = CoreSlackWorkerLoggingHelper.createEnhancedLogContext(
      COMPONENT_NAME,
      'save',
      sendSlackMessageId,
      user,
    );

    this.logger.debug(
      logContext,
      `Saving sendSlackMessage: ${sendSlackMessageId}`,
    );

    try {
      // Convert the Message aggregate to DTO first
      const sendSlackMessageDto = data.toDto();

      // Convert the domain objects to entity format
      const entity = new MessageEntity();
      entity.tenantId = tenantId!; // Assert non-null since we validated user
      entity.id = sendSlackMessageDto.id;
      entity.channel = sendSlackMessageDto.channel;
      entity.configCode = sendSlackMessageDto.configCode;
      entity.templateCode = sendSlackMessageDto.templateCode;
      entity.payload = sendSlackMessageDto.payload;
      entity.scheduledAt = sendSlackMessageDto.scheduledAt;
      entity.correlationId = sendSlackMessageDto.correlationId;
      entity.status = sendSlackMessageDto.status;
      entity.retryCount = sendSlackMessageDto.retryCount;

      // Save the entity
      const savedEntity = await this.sendSlackMessageRepository.save(entity);

      this.logger.debug(
        logContext,
        `Successfully saved sendSlackMessage: ${sendSlackMessageId}`,
      );

      // Convert back to IMessage format and return
      return await this.get(user, savedEntity.id);
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          tenantId,
          sendSlackMessageId,
          username: user?.preferred_username,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to save sendSlackMessage',
      );

      if (error instanceof MessageDomainException) {
        throw error;
      }

      throw new MessageDomainException(MessageExceptionMessage.updateError);
    }
  }

  async saveMessage(user: IUserToken, data: Message): Promise<IMessage> {
    return await this.save(user, data);
  }

  /**
   * Hydrates a MessageEntity to a complete IMessage domain object
   * @private
   */
  public hydrateMessageEntity(
    user: IUserToken,
    entity: MessageEntity,
    logContext: Record<string, unknown>,
  ): IMessage {
    try {
      // Construct the complete domain object
      return {
        id: entity.id,
        channel: entity.channel,
        configCode: entity.configCode,
        templateCode: entity.templateCode,
        payload: entity.payload,
        scheduledAt: entity.scheduledAt,
        correlationId: entity.correlationId,
        status: entity.status,
        retryCount: entity.retryCount,
      };
    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          sendSlackMessageId: entity.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to hydrate sendSlackMessage entity: ${entity.id}`,
      );
      throw error;
    }
  }
}
