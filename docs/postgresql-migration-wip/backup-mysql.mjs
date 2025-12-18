import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse MySQL connection string
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
};

async function backup() {
  console.log('Connecting to MySQL database...');
  const connection = await mysql.createConnection(config);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `mysql-backup-${timestamp}.json`);
  
  console.log('Fetching table list...');
  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  console.log(`Found ${tableNames.length} tables`);
  
  const backup = {
    timestamp: new Date().toISOString(),
    database: config.database,
    tables: {}
  };
  
  for (const tableName of tableNames) {
    try {
      console.log(`Backing up table: ${tableName}`);
      
      // Get table structure
      const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const structure = createTable[0]['Create Table'];
      
      // Get table data
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      
      backup.tables[tableName] = {
        structure,
        rowCount: rows.length,
        data: rows
      };
      
      console.log(`  - ${rows.length} rows`);
    } catch (err) {
      console.error(`Error backing up ${tableName}:`, err.message);
      backup.tables[tableName] = {
        error: err.message,
        rowCount: 0,
        data: []
      };
    }
  }
  
  // Write backup file
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\\nBackup saved to: ${backupFile}`);
  
  // Create summary
  const summaryFile = path.join(backupDir, `mysql-backup-${timestamp}-summary.txt`);
  let summary = `MySQL Database Backup Summary\\n`;
  summary += `============================\\n`;
  summary += `Timestamp: ${backup.timestamp}\\n`;
  summary += `Database: ${backup.database}\\n`;
  summary += `Total Tables: ${tableNames.length}\\n\\n`;
  summary += `Table Details:\\n`;
  
  for (const [name, info] of Object.entries(backup.tables)) {
    summary += `  - ${name}: ${info.rowCount} rows${info.error ? ' (ERROR: ' + info.error + ')' : ''}\\n`;
  }
  
  fs.writeFileSync(summaryFile, summary);
  console.log(`Summary saved to: ${summaryFile}`);
  
  await connection.end();
  console.log('\\nBackup completed successfully!');
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
