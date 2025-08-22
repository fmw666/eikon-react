
/**
 * @file init_supabase_tables.cjs
 * @description Script to create default tables and policies in Supabase PostgreSQL database.
 * @author fmw666@github
 * @version 1.0.0
 *
 * This script connects to a Supabase PostgreSQL instance and creates the required tables (tasks)
 * by executing the corresponding SQL files. It is intended for development and deployment automation.
 *
 * Usage:
 *   1. Ensure you have the correct Supabase connection string.
 *   2. Place your table definition SQL files in the ./sqls directory.
 *   3. Run this script with Node.js: `node init_supabase_tables.cjs`
 *
 * Note: This script is for development/automation purposes. Do not expose credentials in production.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read SQL files for table creation
const create_tasks_sql = fs.readFileSync(path.join(__dirname, '../sqls/tasks_table.sql'), 'utf8');

// ? -> Please refer to `docs/supabase/db/README.md` for how to get the connection string
const client = new Client({
  // replace with your Supabase connection string
  connectionString: process.env.VITE_SUPABASE_POSTGRES_URL,
});

/**
 * Main entry point for table creation.
 * Connects to the database, executes table creation SQL, and closes the connection.
 * Logs results to the console.
 *
 * @async
 * @returns {Promise<void>}
 */
async function main() {
  try {
    console.log('[INFO] Connecting to Supabase...');
    await client.connect();

    // Create tasks table (Run first)
    console.log('[INFO] Creating tasks table...');
    const res_tasks = await client.query(create_tasks_sql);
    console.log('[INFO] Tasks table result:', res_tasks.rows);
    console.log('[INFO] Tasks table created successfully.');
  } catch (error) {
    console.error('[ERROR] Error creating tables:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('[INFO] Tables created and connection closed.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[ERROR] Error creating tables:', err);
  process.exit(1);
});
