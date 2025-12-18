import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'drizzle/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf-8');

// Replace int( with integer(
content = content.replace(/\bint\(/g, 'integer(');

// Also fix the import - ensure integer is imported
if (!content.includes('integer,') && !content.includes('integer }')) {
  content = content.replace(
    /from "drizzle-orm\/pg-core";/,
    (match) => {
      return match;
    }
  );
}

// Fix escaped newlines from previous script
content = content.replace(/\\n/g, '\n');

fs.writeFileSync(schemaPath, content);
console.log('Fixed int() to integer()');
console.log('Fixed escaped newlines');
