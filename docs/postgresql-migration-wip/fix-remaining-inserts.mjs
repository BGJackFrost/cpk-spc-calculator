import fs from 'fs';
import path from 'path';

// Find all TypeScript files
function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const serverDir = path.join(process.cwd(), 'server');
const files = findTsFiles(serverDir);
let totalFixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;
  const originalContent = content;
  
  // Pattern: result[0].insertId -> result[0].id (after .returning())
  if (content.includes('result[0].insertId')) {
    content = content.replace(/result\[0\]\.insertId/g, 'result[0].id');
    modified = true;
  }
  
  // Pattern: const backupId = Number(result[0].id) where insert doesn't have .returning()
  // We need to find insert patterns without .returning() and add it
  
  // More specific pattern for insert without returning
  const insertPattern = /await db\.insert\((\w+)\)\.values\(([^)]+(?:\([^)]*\)[^)]*)*)\)(?!\.returning)/g;
  let match;
  const matches = [];
  while ((match = insertPattern.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      tableName: match[1],
      index: match.index
    });
  }
  
  // Replace from end to start to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    // Check if this is followed by result[0].id or similar
    const afterInsert = content.substring(m.index + m.fullMatch.length, m.index + m.fullMatch.length + 200);
    if (afterInsert.includes('result[0].id') || afterInsert.includes('result[0].insertId')) {
      const newInsert = m.fullMatch + `.returning({ id: ${m.tableName}.id })`;
      content = content.substring(0, m.index) + newInsert + content.substring(m.index + m.fullMatch.length);
      modified = true;
    }
  }
  
  if (modified && content !== originalContent) {
    fs.writeFileSync(file, content);
    totalFixed++;
    console.log('Fixed:', file);
  }
}

console.log('Total files fixed:', totalFixed);
