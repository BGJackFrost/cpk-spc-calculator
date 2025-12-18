/**
 * Script to apply database indexes for performance optimization
 * Run: node scripts/apply-indexes.mjs
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyIndexes() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(databaseUrl);

  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, '../drizzle/add-indexes.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and filter empty statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} index statements to execute`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // MySQL doesn't support IF NOT EXISTS for CREATE INDEX
        // So we need to check if index exists first
        const indexMatch = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i);
        if (indexMatch) {
          const indexName = indexMatch[1];
          const tableMatch = statement.match(/ON (\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : null;
          
          if (tableName) {
            // Check if index exists
            const [rows] = await connection.execute(
              `SHOW INDEX FROM ${tableName} WHERE Key_name = ?`,
              [indexName]
            );
            
            if (rows.length > 0) {
              console.log(`⏭️  Index ${indexName} already exists on ${tableName}, skipping`);
              skipCount++;
              continue;
            }
          }
          
          // Remove IF NOT EXISTS since MySQL doesn't support it
          const cleanStatement = statement.replace(/IF NOT EXISTS /gi, '');
          await connection.execute(cleanStatement);
          console.log(`✅ Created index: ${indexName}`);
          successCount++;
        }
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⏭️  Index already exists, skipping`);
          skipCount++;
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log(`⚠️  Table does not exist, skipping: ${error.message}`);
          skipCount++;
        } else {
          console.error(`❌ Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log('\\n=== Summary ===');
    console.log(`✅ Created: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);

  } finally {
    await connection.end();
    console.log('\\nDatabase connection closed');
  }
}

applyIndexes().catch(console.error);
