import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessLevelGuard } from './guards/access-level.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

/**
 * Global so guards/services are available app-wide. JwtAuthGuard is the app-wide
 * default guard (fail closed unless @Public). Data access uses the global
 * DRIZZLE provider, so no per-module repository registration is needed.
 */
@Global()
@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    AccessLevelGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccessLevelGuard },
  ],
  exports: [AuthService, OtpService, TokenService, JwtAuthGuard, AccessLevelGuard],
})
export class AuthModule {}
