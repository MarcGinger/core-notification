/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

export const staticResponse = {
  headers: {
    'X-RateLimit-Limit': {
      description:
        'The maximum number of requests you’re permitted to make per minute',
      schema: { type: 'integer', example: 60 },
    },
    'X-RateLimit-Remaining': {
      description:
        'The number of requests remaining in the current rate limit window',
      schema: { type: 'integer', example: 42 },
    },
  },
};
