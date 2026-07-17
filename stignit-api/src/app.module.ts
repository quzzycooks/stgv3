import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { CryptoModule } from './common/crypto/crypto.module';
import { DrizzleModule } from './database/drizzle.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { UsersModule } from './users/users.module';
import { IncidentsModule } from './incidents/incidents.module';
import { WelfareModule } from './welfare/welfare.module';
import { DetectionModule } from './detection/detection.module';
import { BreakoutModule } from './breakout/breakout.module';
import { TransportModule } from './transport/transport.module';
import { InstitutionalModule } from './institutional/institutional.module';
import { IncidentDnaModule } from './incident-dna/incident-dna.module';
import { DrillsModule } from './drills/drills.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CryptoModule,
    RedisModule,
    DrizzleModule,
    MessagingModule,
    NotificationModule,
    AuthModule,
    AdminAuthModule,
    UsersModule,
    IncidentsModule,
    WelfareModule,
    DetectionModule,
    BreakoutModule,
    TransportModule,
    InstitutionalModule,
    IncidentDnaModule,
    DrillsModule,
    KnowledgeModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
