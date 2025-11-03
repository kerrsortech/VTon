#!/bin/bash

# Automated Database Migration Script
# Run all pending migrations on Neon PostgreSQL database

set -e  # Exit on error

echo "🗄️  Database Migration Script"
echo "================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it with:"
    echo "  export DATABASE_URL='postgresql://user:password@host/database'"
    echo ""
    exit 1
fi

echo "✅ Database URL found"
echo "📍 Database: $(echo $DATABASE_URL | sed -E 's/postgresql:\/\/([^:]+):.+@([^\/]+)\/.+/\1@\2/')"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ ERROR: Cannot connect to database"
    echo "Please check your DATABASE_URL and network connection"
    exit 1
fi
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
MIGRATIONS_DIR="$PROJECT_ROOT/lib/db/migrations"

echo "📂 Migrations directory: $MIGRATIONS_DIR"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ ERROR: Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Create migrations tracking table if it doesn't exist
echo "📋 Creating migrations tracking table..."
psql "$DATABASE_URL" << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
echo "✅ Migrations tracking table ready"
echo ""

# Get list of applied migrations
APPLIED_MIGRATIONS=$(psql "$DATABASE_URL" -t -c "SELECT migration_name FROM schema_migrations ORDER BY migration_name" | tr -d ' ')

# Run each migration file
echo "🚀 Running migrations..."
echo ""

MIGRATIONS_RUN=0
MIGRATIONS_SKIPPED=0

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        MIGRATION_NAME=$(basename "$migration_file")
        
        # Check if migration was already applied
        if echo "$APPLIED_MIGRATIONS" | grep -q "^${MIGRATION_NAME}$"; then
            echo "⏭️  Skipping (already applied): $MIGRATION_NAME"
            MIGRATIONS_SKIPPED=$((MIGRATIONS_SKIPPED + 1))
        else
            echo "▶️  Running: $MIGRATION_NAME"
            
            # Run migration
            if psql "$DATABASE_URL" -f "$migration_file"; then
                # Record migration as applied
                psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$MIGRATION_NAME')"
                echo "✅ Success: $MIGRATION_NAME"
                MIGRATIONS_RUN=$((MIGRATIONS_RUN + 1))
            else
                echo "❌ FAILED: $MIGRATION_NAME"
                echo ""
                echo "Migration failed. Please fix the error and run again."
                exit 1
            fi
            echo ""
        fi
    fi
done

echo "================================"
echo "📊 Migration Summary:"
echo "  - Migrations run: $MIGRATIONS_RUN"
echo "  - Migrations skipped: $MIGRATIONS_SKIPPED"
echo ""

if [ $MIGRATIONS_RUN -gt 0 ]; then
    echo "✅ Database migrations completed successfully!"
else
    echo "ℹ️  No new migrations to run"
fi
echo ""

# Verify critical tables exist
echo "🔍 Verifying database schema..."
EXPECTED_TABLES=("user_images" "try_on_events" "shopify_sessions" "dashboard_analytics")
MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
    if psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q 1; then
        echo "✅ Table exists: $table"
    else
        echo "⚠️  Table missing: $table"
        MISSING_TABLES+=("$table")
    fi
done
echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo "✅ All expected tables exist"
else
    echo "⚠️  Warning: ${#MISSING_TABLES[@]} table(s) missing: ${MISSING_TABLES[*]}"
    echo "This may be normal if those features are not yet implemented."
fi
echo ""

# Show sessions table schema (most critical for Shopify integration)
echo "📋 Shopify Sessions Table Schema:"
psql "$DATABASE_URL" -c "\d shopify_sessions" 2>/dev/null || echo "⚠️  Table shopify_sessions not found"
echo ""

echo "================================"
echo "✅ Database migration script completed!"
echo ""

