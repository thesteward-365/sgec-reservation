import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle-pg',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
