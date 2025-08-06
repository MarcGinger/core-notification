-- Rollback Migration: Remove serviceContext column from processed_events table
-- Description: Reverts the serviceContext column addition for multi-service support
-- Date: 2025-08-07

BEGIN;

-- Drop the new composite primary key
ALTER TABLE core_slack_worker.processed_events 
DROP CONSTRAINT IF EXISTS processed_events_pkey;

-- Restore the original primary key (without serviceContext)
ALTER TABLE core_slack_worker.processed_events 
ADD CONSTRAINT processed_events_pkey PRIMARY KEY (streamName, revision);

-- Remove the serviceContext column
ALTER TABLE core_slack_worker.processed_events 
DROP COLUMN IF EXISTS serviceContext;

COMMIT;

-- Verify the rollback
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'core_slack_worker' 
  AND table_name = 'processed_events'
ORDER BY ordinal_position;
