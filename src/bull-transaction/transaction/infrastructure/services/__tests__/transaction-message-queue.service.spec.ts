/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  IGenericQueue,
  PRIORITY_LEVELS,
  QUEUE_TOKENS,
} from '../../../../../shared/message-queue';
import { TransactionMessageQueueService } from '../transaction-message-queue.service';

describe('TransactionMessageQueueService', () => {
  let service: TransactionMessageQueueService;
  let mockQueue: jest.Mocked<IGenericQueue>;
  let mockQueueRegistry: Map<string, IGenericQueue>;

  beforeEach(async () => {
    // Create mock queue
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      addBulk: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 10,
        failed: 0,
        delayed: 0,
      }),
    };

    // Create mock queue registry
    mockQueueRegistry = new Map();
    mockQueueRegistry.set('transaction-processing', mockQueue);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionMessageQueueService,
        {
          provide: QUEUE_TOKENS.QUEUE_REGISTRY,
          useValue: mockQueueRegistry,
        },
      ],
    }).compile();

    service = module.get<TransactionMessageQueueService>(
      TransactionMessageQueueService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueSettlement', () => {
    it('should enqueue settlement job with correct parameters', async () => {
      const settlementData = {
        txId: 'test-tx-123',
        amount: 1000,
        currency: 'USD',
        fromAccount: 'acc-1',
        toAccount: 'acc-2',
      };

      await service.enqueueSettlement(settlementData, 'corr-123');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'transaction.settlement.v1',
        settlementData,
        {
          attempts: 5,
          priority: PRIORITY_LEVELS.HIGH,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: 'corr-123',
        },
      );
    });

    it('should generate job ID when correlation ID not provided', async () => {
      const settlementData = {
        txId: 'test-tx-456',
        amount: 500,
        currency: 'EUR',
        fromAccount: 'acc-3',
        toAccount: 'acc-4',
      };

      await service.enqueueSettlement(settlementData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'transaction.settlement.v1',
        settlementData,
        expect.objectContaining({
          attempts: 5,
          priority: PRIORITY_LEVELS.HIGH,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: 'settlement-test-tx-456',
        }),
      );
    });
  });

  describe('enqueueRefund', () => {
    it('should enqueue refund job with correct parameters', async () => {
      const refundData = {
        txId: 'refund-tx-789',
        reason: 'Customer request',
        amount: 250,
      };

      await service.enqueueRefund(refundData, 'refund-corr-123');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'transaction.refund.v1',
        refundData,
        {
          attempts: 3,
          priority: PRIORITY_LEVELS.HIGH,
          jobId: 'refund-corr-123',
        },
      );
    });
  });

  describe('enqueueValidation', () => {
    it('should enqueue validation job with correct parameters', async () => {
      const validationData = {
        txId: 'validation-tx-101',
        rules: ['rule1', 'rule2', 'rule3'],
      };

      await service.enqueueValidation(validationData, 'validation-corr-456');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'transaction.validation.v1',
        validationData,
        {
          attempts: 2,
          priority: PRIORITY_LEVELS.NORMAL,
          jobId: 'validation-corr-456',
        },
      );
    });
  });

  describe('error handling', () => {
    it('should throw error if transaction processing queue not found', () => {
      // Clear the queue registry
      mockQueueRegistry.clear();

      expect(() => service['getQueue']()).toThrow(
        'Transaction processing queue not found',
      );
    });
  });
});
