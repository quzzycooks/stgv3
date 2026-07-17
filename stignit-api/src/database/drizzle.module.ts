import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE';
export const PG_POOL = 'PG_POOL';

/** The typed Drizzle database handle injected across the app. */
export type Db = NodePgDatabase<typeof schema>;

/**
 * Global Drizzle provider (replaces the TypeORM DataSource).
 *
 * NOTE on PRD 7.2 replication: node-postgres has no built-in read/write split.
 * For MVP this is a single primary pool; a replica read-pool + routing helper is
 * a follow-up. Pool size is tuned via env for the 10k-room target (7.3).
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('db');
        return new Pool({
          host: db.host,
          port: db.port,
          user: db.user,
          password: db.password,
          database: db.name,
          max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema, casing: 'snake_case' }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DrizzleModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  async onModuleDestroy(): Promise<void> {
    await this.pool.end().catch(() => undefined);
  }
}
