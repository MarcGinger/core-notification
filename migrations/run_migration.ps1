# Database Migration Script
# Run this to apply the serviceContext column migration

# Make sure you have the correct database connection details
# Update these variables with your actual database credentials

$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "your_database_name"
$DB_USER = "your_username"
$DB_PASSWORD = "your_password"

Write-Host "Applying migration: Add serviceContext column to processed_events table..."

# Run the migration SQL
try {
    psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f "migrations/001_add_service_context_to_processed_events.sql"
    Write-Host "Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "Migration failed: $_" -ForegroundColor Red
    Write-Host "You may need to run this SQL manually in your database client."
}

Write-Host ""
Write-Host "Migration SQL file location: migrations/001_add_service_context_to_processed_events.sql"
Write-Host "Rollback SQL file location: migrations/001_add_service_context_to_processed_events_rollback.sql"
