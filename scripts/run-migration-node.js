#!/usr/bin/env node

/**
 * Node.js-based Database Migration Runner
 * Runs migrations without requiring psql command
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required');
  console.error('Please set it with: export DATABASE_URL=\'postgresql://...\'\n');
  process.exit(1);
}

async function runMigrations() {
  console.log('🗄️  Node.js Database Migration Runner');
  console.log('======================================\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const migrationsDir = path.join(__dirname, '../lib/db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${files.length} migration(s)\n`);

    for (const file of files) {
      console.log(`▶️  Running: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${file} already applied (skipped)\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ All migrations completed successfully!');
    
    // Test query
    console.log('\n🧪 Testing shopify_sessions table...');
    const result = await client.query('SELECT COUNT(*) FROM shopify_sessions');
    console.log(`✅ Table exists with ${result.rows[0].count} session(s)`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

