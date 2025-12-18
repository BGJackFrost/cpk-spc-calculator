import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Find all TypeScript files in server directory
const serverDir = path.join(process.cwd(), 'server');

function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findTsFiles(serverDir);
let totalFixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;
  
  // Pattern 1: Fix insert with returning for id
  const pattern1 = /const result = await db\.insert\((\w+)\)\.values\(([^)]+)\);(\s+)return result\[0\]\.id;/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, 'const result = await db.insert($1).values($2).returning({ id: $1.id });$3return result[0].id;');
    modified = true;
  }
  
  // Pattern 2: Fix insert with insertId
  const pattern2 = /const result = await db\.insert\((\w+)\)\.values\(([^)]+)\);(\s+)return result\[0\]\.insertId;/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'const result = await db.insert($1).values($2).returning({ id: $1.id });$3return result[0].id;');
    modified = true;
  }
  
  // Pattern 3: Fix db possibly null - add non-null assertion
  // This is a simple fix, might need manual review
  const pattern3 = /const db = await getDb\(\);(\s+)(?!if \(!db\))/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, 'const db = await getDb();\n  if (!db) throw new Error("Database not available");$1');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(file, content);
    totalFixed++;
    console.log('Fixed:', file);
  }
}

console.log('Total files fixed:', totalFixed);
