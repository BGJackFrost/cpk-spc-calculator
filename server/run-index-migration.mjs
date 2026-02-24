/**
 * Script to run index migration for database optimization
 * Run with: node server/run-index-migration.mjs
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(databaseUrl);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_indexes.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Skip comments
        if (statement.startsWith('--')) continue;
        
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await connection.execute(statement);
        successCount++;
        console.log('  ✓ Success');
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          skipCount++;
          console.log('  ⊘ Index already exists, skipping');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
          skipCount++;
          console.log('  ⊘ Table does not exist, skipping');
        } else {
          errorCount++;
          console.error(`  ✗ Error: ${error.message}`);
        }
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Success: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);
    console.log(`Errors: ${errorCount}`);

  } finally {
    await connection.end();
    console.log('\nDatabase connection closed');
  }
}

runMigration().catch(console.error);
