/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

// generate-commands
import { CreateMessageHandler } from './create/create-message.handler';
import { SendSlackMessageHandler } from './send/send-slack-message.handler';

// application/commands/index.ts
export const MessageCommands = [CreateMessageHandler, SendSlackMessageHandler];

export * from './create/create-message.command';
export * from './send/send-slack-message.command';
