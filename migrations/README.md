# Database Migration Required

## Issue

The application is failing with the error:

```
column ProcessedEventEntity.serviceContext does not exist
```

This is because we've updated the `ProcessedEventEntity` to support multi-service event processing, but the database table hasn't been migrated yet.

## Quick Fix Options

### Option 1: Run the SQL Migration (Recommended)

1. **Connect to your PostgreSQL database** using your preferred client (pgAdmin, DBeaver, psql, etc.)

2. **Run the migration SQL**:

   ```sql
   -- Add serviceContext column and update primary key
   BEGIN;

   ALTER TABLE core_slack_worker.processed_events
   ADD COLUMN IF NOT EXISTS serviceContext VARCHAR(100);

   UPDATE core_slack_worker.processed_events
   SET serviceContext = 'slack-worker'
   WHERE serviceContext IS NULL;

   ALTER TABLE core_slack_worker.processed_events
   ALTER COLUMN serviceContext SET NOT NULL;

   ALTER TABLE core_slack_worker.processed_events
   DROP CONSTRAINT IF EXISTS processed_events_pkey;

   ALTER TABLE core_slack_worker.processed_events
   ADD CONSTRAINT processed_events_pkey PRIMARY KEY (streamName, revision, serviceContext);

   COMMIT;
   ```

3. **Restart your application** - it should now work correctly.

### Option 2: Use PowerShell Script

1. **Update the database connection details** in `migrations/run_migration.ps1`
2. **Run the script**:
   ```powershell
   ./migrations/run_migration.ps1
   ```

### Option 3: Temporary Entity Fix (If you can't run migration immediately)

The entity has been temporarily updated to make `serviceContext` nullable with a default value. This allows the application to start, but you should still run the migration as soon as possible.

## What This Migration Does

1. **Adds `serviceContext` column** to store which service processed the event (`slack-worker`, `email-service`, etc.)
2. **Sets default values** for existing records to `'slack-worker'`
3. **Updates the primary key** to include `serviceContext` for proper multi-service isolation
4. **Ensures data integrity** with NOT NULL constraint

## Post-Migration Benefits

After running this migration, you'll have:

- ✅ **Multi-service support**: Different notification services can track their own processed events
- ✅ **Service isolation**: Slack events won't interfere with Email service events
- ✅ **Backwards compatibility**: Existing Slack worker functionality remains unchanged
- ✅ **Future-proof**: Ready for Email, Teams, SMS services

## Rollback

If you need to rollback the migration, run:

```sql
-- File: migrations/001_add_service_context_to_processed_events_rollback.sql
```

## Files Created

- `migrations/001_add_service_context_to_processed_events.sql` - Forward migration
- `migrations/001_add_service_context_to_processed_events_rollback.sql` - Rollback migration
- `migrations/run_migration.ps1` - PowerShell script to run migration
- `migrations/README.md` - This file

## Verification

After running the migration, verify it worked:

```sql
-- Check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'core_slack_worker'
  AND table_name = 'processed_events'
ORDER BY ordinal_position;

-- Check existing data
SELECT streamName, revision, serviceContext, processingStatus, processedAt
FROM core_slack_worker.processed_events
LIMIT 5;
```

You should see the `serviceContext` column with existing records having `'slack-worker'` as the value.
