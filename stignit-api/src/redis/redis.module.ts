import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Single shared ioredis connection (OTP store, rate limiting, token blacklist,
 * GEO proximity, event-bus streams). BullMQ opens its own connections.
 * `maxRetriesPerRequest: null` keeps commands queued through brief reconnects
 * rather than failing the critical path outright.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const r = config.get('redis');
        return new Redis({
          host: r.host,
          port: r.port,
          password: r.password,
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: false,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor() {}
  async onModuleDestroy(): Promise<void> {
    // Connections are closed by Nest DI teardown of the provider in tests;
    // explicit quit handled where the client is injected if needed.
  }
}
