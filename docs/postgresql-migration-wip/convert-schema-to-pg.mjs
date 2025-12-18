import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'drizzle/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf-8');

// Store original for backup
const backupPath = path.join(process.cwd(), 'backups/schema-mysql-backup.ts');
fs.writeFileSync(backupPath, content);
console.log('Schema backup saved to:', backupPath);

// 1. Replace imports
content = content.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']drizzle-orm\/mysql-core["'];?/g,
  (match, imports) => {
    // Map MySQL imports to PostgreSQL imports
    const importMap = {
      'mysqlTable': 'pgTable',
      'mysqlEnum': 'pgEnum',
      'int': 'integer',
      'tinyint': 'smallint',
      'bigint': 'bigint',
      'float': 'real',
      'double': 'doublePrecision',
      'decimal': 'numeric',
      'varchar': 'varchar',
      'char': 'char',
      'text': 'text',
      'boolean': 'boolean',
      'date': 'date',
      'datetime': 'timestamp',
      'timestamp': 'timestamp',
      'time': 'time',
      'json': 'jsonb',
      'serial': 'serial',
      'uniqueIndex': 'uniqueIndex',
      'index': 'index',
    };
    
    let pgImports = imports.split(',').map(i => {
      const trimmed = i.trim();
      return importMap[trimmed] || trimmed;
    });
    
    // Remove duplicates
    pgImports = [...new Set(pgImports)];
    
    // Add serial for auto-increment
    if (!pgImports.includes('serial')) {
      pgImports.push('serial');
    }
    
    return `import { ${pgImports.join(', ')} } from "drizzle-orm/pg-core";`;
  }
);

// 2. Replace mysqlTable with pgTable
content = content.replace(/mysqlTable\(/g, 'pgTable(');

// 3. Replace int().autoincrement().primaryKey() with serial().primaryKey()
content = content.replace(/int\(["'][^"']+["']\)\.autoincrement\(\)\.primaryKey\(\)/g, (match) => {
  const colName = match.match(/int\(["']([^"']+)["']\)/)[1];
  return `serial("${colName}").primaryKey()`;
});

// 4. Replace mysqlEnum with pgEnum - need to extract and define enums separately
const enumDefinitions = [];
const enumUsages = new Map();

// Find all mysqlEnum usages
const enumRegex = /mysqlEnum\(["']([^"']+)["'],\s*\[([^\]]+)\]\)/g;
let enumMatch;
while ((enumMatch = enumRegex.exec(content)) !== null) {
  const enumName = enumMatch[1];
  const enumValues = enumMatch[2];
  const pgEnumName = `${enumName}Enum`;
  
  if (!enumUsages.has(enumName)) {
    enumUsages.set(enumName, pgEnumName);
    enumDefinitions.push(`export const ${pgEnumName} = pgEnum("${enumName}", [${enumValues}]);`);
  }
}

// Replace mysqlEnum usages with pgEnum references
content = content.replace(/mysqlEnum\(["']([^"']+)["'],\s*\[([^\]]+)\]\)/g, (match, enumName, values) => {
  const pgEnumName = enumUsages.get(enumName);
  return `${pgEnumName}("${enumName}")`;
});

// 5. Replace onUpdateNow() - PostgreSQL doesn't have this, need to remove or use trigger
content = content.replace(/\.onUpdateNow\(\)/g, '');

// 6. Replace int("isActive") patterns with boolean
// Keep as integer for now since we use 0/1 values
// content = content.replace(/int\(["']isActive["']\)/g, 'boolean("isActive")');

// 7. Replace json with jsonb
content = content.replace(/\bjson\(/g, 'jsonb(');

// 8. Add enum definitions after imports
const importEndIndex = content.indexOf('export const');
if (importEndIndex > 0 && enumDefinitions.length > 0) {
  const beforeExports = content.substring(0, importEndIndex);
  const afterExports = content.substring(importEndIndex);
  content = beforeExports + '\\n// PostgreSQL Enum Types\\n' + enumDefinitions.join('\\n') + '\\n\\n' + afterExports;
}

// Write converted schema
fs.writeFileSync(schemaPath, content);
console.log('Schema converted to PostgreSQL syntax');
console.log('Enum definitions added:', enumDefinitions.length);

// Print summary of changes
console.log('\\nChanges made:');
console.log('- Replaced drizzle-orm/mysql-core with drizzle-orm/pg-core');
console.log('- Replaced mysqlTable with pgTable');
console.log('- Replaced int().autoincrement().primaryKey() with serial().primaryKey()');
console.log('- Created pgEnum definitions for all enum types');
console.log('- Removed onUpdateNow() (not supported in PostgreSQL)');
console.log('- Replaced json with jsonb');
