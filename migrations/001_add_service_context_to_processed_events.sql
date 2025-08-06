-- Migration: Add serviceContext column to processed_events table
-- Description: Adds serviceContext column to support multi-service event processing
-- Date: 2025-08-07

BEGIN;

-- Add the serviceContext column to the processed_events table
ALTER TABLE core_slack_worker.processed_events 
ADD COLUMN IF NOT EXISTS serviceContext VARCHAR(100);

-- Set default value for existing records to 'slack-worker' since they were all from slack worker
UPDATE core_slack_worker.processed_events 
SET serviceContext = 'slack-worker' 
WHERE serviceContext IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE core_slack_worker.processed_events 
ALTER COLUMN serviceContext SET NOT NULL;

-- Update the primary key to include serviceContext for proper multi-service isolation
-- First, drop the existing primary key
ALTER TABLE core_slack_worker.processed_events 
DROP CONSTRAINT IF EXISTS processed_events_pkey;

-- Add the new composite primary key
ALTER TABLE core_slack_worker.processed_events 
ADD CONSTRAINT processed_events_pkey PRIMARY KEY (streamName, revision, serviceContext);

COMMIT;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'core_slack_worker' 
  AND table_name = 'processed_events'
ORDER BY ordinal_position;
