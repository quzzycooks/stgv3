import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit config. Schema is the source of truth; `drizzle-kit generate`
 * produces SQL migrations into ./drizzle. The committed 0000_init.sql was
 * authored to bootstrap PostGIS + the full schema.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'stignit',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'stignit',
    ssl: false,
  },
});
