import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'drizzle/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf-8');

// Fix statusEnum - add more values
content = content.replace(
  /export const statusEnum = pgEnum\("status", \["pending", "approved", "rejected", "cancelled"\]\);/,
  'export const statusEnum = pgEnum("status", ["pending", "approved", "rejected", "cancelled", "active", "inactive", "draft", "normal", "generated", "offline"]);'
);

// Fix severityEnum - add more values
content = content.replace(
  /export const severityEnum = pgEnum\("severity", \["warning", "critical"\]\);/,
  'export const severityEnum = pgEnum("severity", ["info", "low", "medium", "warning", "critical"]);'
);

// Fix userTypeEnum - add online
content = content.replace(
  /export const userTypeEnum = pgEnum\("userType", \["manus", "local"\]\);/,
  'export const userTypeEnum = pgEnum("userType", ["manus", "local", "online"]);'
);

fs.writeFileSync(schemaPath, content);
console.log('Fixed enum values in schema.ts');
