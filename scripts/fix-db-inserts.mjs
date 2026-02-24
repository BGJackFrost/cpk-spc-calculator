import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'server/db.ts');
let content = fs.readFileSync(dbPath, 'utf-8');

// Pattern 1: const result = await db.insert(table).values(data); return result[0].id;
// Replace with: const result = await db.insert(table).values(data).returning({ id: table.id }); return result[0].id;

// Find all insert patterns and add .returning()
// This is complex because we need to know the table name

// Simpler approach: change result[0].id to use returning
// Pattern: await db.insert(X).values(Y); ... return result[0].id
content = content.replace(
  /const result = await db\.insert\((\w+)\)\.values\(([^)]+)\);(\s+)return result\[0\]\.id;/g,
  'const result = await db.insert($1).values($2).returning({ id: $1.id });$3return result[0].id;'
);

// Also fix insertId patterns
content = content.replace(
  /const result = await db\.insert\((\w+)\)\.values\(([^)]+)\);(\s+)return result\[0\]\.insertId;/g,
  'const result = await db.insert($1).values($2).returning({ id: $1.id });$3return result[0].id;'
);

// Fix patterns where result is used differently
content = content.replace(
  /await db\.insert\((\w+)\)\.values\(([^)]+)\);(\s+)const id = result\[0\]\.insertId;/g,
  'const result = await db.insert($1).values($2).returning({ id: $1.id });$3const id = result[0].id;'
);

fs.writeFileSync(dbPath, content);
console.log('Fixed insert patterns in db.ts');

// Count remaining issues
const remaining = (content.match(/result\[0\]\.insertId/g) || []).length;
console.log('Remaining insertId patterns:', remaining);
const resultId = (content.match(/result\[0\]\.id/g) || []).length;
console.log('result[0].id patterns:', resultId);
