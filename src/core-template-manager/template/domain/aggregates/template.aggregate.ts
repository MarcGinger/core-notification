/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { AggregateRoot } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { IAggregateWithDto } from 'src/shared/domain/domain.model';
import {
  ITemplate,
  TemplateTransportEnum,
  TemplateUseCaseEnum,
} from '../entities';
import { TemplateCreatedEvent, TemplateUpdatedEvent } from '../events';
import {
  TemplateDomainException,
  TemplateExceptionMessage,
} from '../exceptions';
import { TemplateProps } from '../properties';
import { TemplateIdentifier } from '../value-objects';

export class Template
  extends AggregateRoot
  implements IAggregateWithDto<ITemplate>
{
  private readonly _code: TemplateIdentifier;
  private _name: string;
  private _description?: string;
  private _transport: TemplateTransportEnum;
  private _useCase: TemplateUseCaseEnum;
  private _version?: number;
  private _content: string;
  private _contentUrl: string;
  private _payloadSchema: Record<string, any>;
  private _active?: boolean;

  constructor(props: TemplateProps) {
    super();
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._transport = props.transport;
    this._useCase = props.useCase;
    this._version = props.version;
    this._content = props.content;
    this._contentUrl = props.contentUrl;
    this._payloadSchema = props.payloadSchema;
    this._active = props.active;
    this.validateState();
  }

  getId(): string {
    return this._code.toString();
  }

  get code(): TemplateIdentifier {
    return this._code;
  }

  public get name(): string {
    return this._name;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public get transport(): TemplateTransportEnum {
    return this._transport;
  }

  public get useCase(): TemplateUseCaseEnum {
    return this._useCase;
  }

  public get version(): number | undefined {
    return this._version;
  }

  public get content(): string {
    return this._content;
  }

  public get contentUrl(): string {
    return this._contentUrl;
  }

  public get payloadSchema(): Record<string, any> {
    return this._payloadSchema;
  }

  public get active(): boolean | undefined {
    return this._active;
  }

  /**
   * Factory method for reconstructing Template aggregate from persisted entity data
   * This ensures proper value object creation during repository hydration
   * @param entity - The persisted template entity from repository
   * @returns Properly reconstructed Template aggregate
   */
  public static fromEntity(entity: ITemplate): Template {
    const props: TemplateProps = {
      code: TemplateIdentifier.fromString(entity.code),
      name: entity.name,
      description: entity.description,
      transport: entity.transport,
      useCase: entity.useCase,
      version: entity.version,
      content: entity.content,
      contentUrl: entity.contentUrl,
      payloadSchema: entity.payloadSchema,
      active: entity.active,
    };

    return new Template(props);
  }

  public toDto(): ITemplate {
    return {
      code: this._code.value,
      name: this._name,
      description: this._description,
      transport: this._transport,
      useCase: this._useCase,
      version: this._version,
      content: this._content,
      contentUrl: this._contentUrl,
      payloadSchema: this._payloadSchema,
      active: this._active,
    };
  }

  /**
   * Creates a DTO without the content field for EventStore serialization.
   * Content is stored in Azure Blob Storage to keep events lightweight.
   * @returns Template data without content field
   */
  public toEventDto(): Omit<ITemplate, 'content'> {
    return {
      code: this._code.value,
      name: this._name,
      description: this._description,
      transport: this._transport,
      useCase: this._useCase,
      version: this._version,
      contentUrl: this._contentUrl,
      payloadSchema: this._payloadSchema,
      active: this._active,
    };
  }

  /**
   * Factory method to create a new Template aggregate with proper event sourcing
   * Use this method instead of the constructor when creating new templates
   * @param user - The user creating the template
   * @param props - The template properties
   * @returns A new Template aggregate with TemplateCreatedEvent applied
   */
  static create(user: IUserToken, props: TemplateProps): Template {
    const template = new Template(props);

    // Apply domain event for event sourcing (without content for efficiency)
    template.apply(
      new TemplateCreatedEvent(user, template.getId(), template.toEventDto()),
    );

    return template;
  }

  /**
   * Updates the Name property of the template.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param name - The new Name value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateName(user: IUserToken, name: string, emitEvent = true): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    // Validate required string field
    if (!name || name.trim() === '') {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldNameRequired,
      );
    }

    const oldName = this._name;
    this._name = name.trim();

    // Emit event only if value actually changed
    if (oldName !== this._name && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Description property of the template.
   * Business rules:
   * - Value is optional
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param description - The new Description value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateDescription(
    user: IUserToken,
    description?: string,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldDescription = this._description;
    this._description = description;

    // Emit event only if value actually changed
    if (oldDescription !== this._description && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Transport property of the template.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param transport - The new Transport value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateTransport(
    user: IUserToken,
    transport: TemplateTransportEnum,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldTransport = this._transport;
    this._transport = transport;

    // Emit event only if value actually changed
    if (oldTransport !== this._transport && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Use case property of the template.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param useCase - The new Use case value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateUseCase(
    user: IUserToken,
    useCase: TemplateUseCaseEnum,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldUseCase = this._useCase;
    this._useCase = useCase;

    // Emit event only if value actually changed
    if (oldUseCase !== this._useCase && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Version property of the template.
   * Business rules:
   * - Value is optional
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param version - The new Version value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateVersion(
    user: IUserToken,
    version?: number,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldVersion = this._version;
    this._version = version;

    // Emit event only if value actually changed
    if (oldVersion !== this._version && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Content property of the template.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param content - The new Content value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateContent(
    user: IUserToken,
    content: string,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    // Validate required string field
    if (!content || content.trim() === '') {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldContentRequired,
      );
    }

    const oldContent = this._content;
    this._content = content.trim();

    // Emit event only if value actually changed
    if (oldContent !== this._content && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Content url property of the template.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param contentUrl - The new Content url value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateContentUrl(
    user: IUserToken,
    contentUrl: string,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    // Validate required string field
    if (!contentUrl || contentUrl.trim() === '') {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldContentUrlRequired,
      );
    }

    const oldContentUrl = this._contentUrl;
    this._contentUrl = contentUrl.trim();

    // Emit event only if value actually changed
    if (oldContentUrl !== this._contentUrl && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Payload schema property of the template.
   * Business rules:
   * - Value is required and cannot be empty
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param payloadSchema - The new Payload schema value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updatePayloadSchema(
    user: IUserToken,
    payloadSchema: Record<string, any>,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldPayloadSchema = this._payloadSchema;
    this._payloadSchema = payloadSchema;

    // Emit event only if value actually changed
    if (oldPayloadSchema !== this._payloadSchema && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  /**
   * Updates the Active property of the template.
   * Business rules:
   * - Value is optional
   * - Emits TemplateUpdatedEvent on successful change
   * @param user - The user performing the operation
   * @param active - The new Active value
   * @param emitEvent - Whether to emit domain events (default: true)
   * @throws {TemplateDomainException} When validation fails or business rules are violated
   */
  public updateActive(
    user: IUserToken,
    active?: boolean,
    emitEvent = true,
  ): void {
    // Validate user context
    if (!user) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.userRequiredForUpdates,
      );
    }

    const oldActive = this._active;
    this._active = active;

    // Emit event only if value actually changed
    if (oldActive !== this._active && emitEvent) {
      this.validateState();
      this.apply(
        new TemplateUpdatedEvent(user, this.getId(), this.toEventDto()),
      );
    }
  }

  private validateState(): void {
    if (!this._code) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldCodeRequired,
      );
    }

    if (!this._name) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldNameRequired,
      );
    }

    if (!this._transport) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldTransportRequired,
      );
    }

    if (!this._useCase) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldUseCaseRequired,
      );
    }

    if (!this._content) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldContentRequired,
      );
    }

    if (!this._contentUrl) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldContentUrlRequired,
      );
    }

    if (!this._payloadSchema) {
      throw new TemplateDomainException(
        TemplateExceptionMessage.fieldPayloadSchemaRequired,
      );
    }
  }

  public toProps(): TemplateProps {
    return {
      code: this._code,
      name: this._name,
      description: this._description,
      transport: this._transport,
      useCase: this._useCase,
      version: this._version,
      content: this._content,
      contentUrl: this._contentUrl,
      payloadSchema: this._payloadSchema,
      active: this._active,
    };
  }
}
