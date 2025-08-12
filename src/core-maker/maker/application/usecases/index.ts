/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateMakerUseCase } from './create-maker.usecase';
import { PublishBankPaymentRequestedEventUseCase } from './publish-bank-payment-requested-event.usecase';
import { UpdateMakerStatusUseCase } from './update-maker-status.usecase';
import { UpdateMakerUseCase } from './update-maker.usecase';

// application/commands/index.ts
export const MakerUseCases = [
  CreateMakerUseCase,
  UpdateMakerUseCase,
  UpdateMakerStatusUseCase,
  PublishBankPaymentRequestedEventUseCase,
];

export {
  CreateMakerUseCase,
  PublishBankPaymentRequestedEventUseCase,
  UpdateMakerStatusUseCase,
  UpdateMakerUseCase,
};
