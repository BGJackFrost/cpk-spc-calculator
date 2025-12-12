import { db } from './server/db.ts';
import { licenses } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function testLicense() {
  try {
    const result = await db.select().from(licenses);
    console.log('All licenses:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testLicense();
