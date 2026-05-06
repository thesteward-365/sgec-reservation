import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const dbType = process.env.DATABASE_TYPE || 'sqlite';

const config = {
  schema: dbType === 'postgres' ? './src/lib/db/schema.pg.ts' : './src/lib/db/schema.ts',
  out: dbType === 'postgres' ? './drizzle-pg' : './drizzle',
};

if (dbType === 'postgres') {
  Object.assign(config, {
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.DATABASE_URL || '',
    },
  });
} else {
  Object.assign(config, {
    dialect: 'sqlite',
    dbCredentials: {
      url: process.env.DATABASE_URL || 'sqlite.db',
    },
  });
}

export default defineConfig(config);
