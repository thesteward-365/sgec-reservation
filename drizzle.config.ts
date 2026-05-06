import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const dbType = process.env.DATABASE_TYPE || 'sqlite';

export default dbType === 'postgres'
  ? defineConfig({
      dialect: 'postgresql',
      schema: './src/lib/db/schema.pg.ts',
      out: './drizzle-pg',
      dbCredentials: {
        url: process.env.DATABASE_URL || '',
      },
    })
  : defineConfig({
      dialect: 'sqlite',
      schema: './src/lib/db/schema.ts',
      out: './drizzle',
      dbCredentials: {
        url: process.env.DATABASE_URL || 'sqlite.db',
      },
    });
