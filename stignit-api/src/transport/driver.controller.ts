import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsLatitude, IsLongitude } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/admin-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRole } from '../admin-auth/admin-identity';
import { DriverAuthGuard } from './driver-auth.guard';
import { TransportService } from './transport.service';

class RespondDto {
  @IsBoolean() accept: boolean;
}
class DriverLocationDto {
  @IsLatitude() lat: number;
  @IsLongitude() lng: number;
}

/**
 * Driver-app endpoints (PRD 6.7.3). Authenticated with a DRIVER-scoped token
 * (separate identity space). Token minting is an Ops action (admin SSO).
 */
@ApiTags('transport-driver')
// Driver/admin identity spaces — opt the whole controller out of the mobile JWT
// guard; each route is secured by DriverAuthGuard or AdminAuthGuard instead.
@Public()
@Controller({ path: 'transport/driver', version: '1' })
export class DriverController {
  constructor(
    private readonly transport: TransportService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post('dispatches/:dispatchId/respond')
  @ApiBearerAuth('driver')
  @UseGuards(DriverAuthGuard)
  @ApiOperation({ summary: 'Accept or decline a dispatch offer (90s window)' })
  respond(@Req() req: any, @Param('dispatchId') dispatchId: string, @Body() dto: RespondDto) {
    return this.transport.respond(dispatchId, req.driverId, dto.accept);
  }

  @Post('location')
  @ApiBearerAuth('driver')
  @UseGuards(DriverAuthGuard)
  @ApiOperation({ summary: 'Stream driver GPS (broadcast to the Situation Room)' })
  location(@Req() req: any, @Body() dto: DriverLocationDto) {
    return this.transport.updateDriverLocation(req.driverId, dto.lat, dto.lng);
  }

  @Post('dispatches/:dispatchId/arrived')
  @ApiBearerAuth('driver')
  @UseGuards(DriverAuthGuard)
  arrived(@Req() req: any, @Param('dispatchId') dispatchId: string) {
    return this.transport.confirmArrival(dispatchId, req.driverId);
  }

  @Post('dispatches/:dispatchId/dropoff')
  @ApiBearerAuth('driver')
  @UseGuards(DriverAuthGuard)
  dropoff(@Req() req: any, @Param('dispatchId') dispatchId: string) {
    return this.transport.confirmDropoff(dispatchId, req.driverId);
  }

  // --- Ops-issued driver session token (admin SSO) ---
  @Public() // opts out of the mobile JWT guard; AdminAuthGuard secures it instead
  @Post(':driverId/token')
  @UseGuards(AdminAuthGuard)
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  @ApiOperation({ summary: 'Mint a driver session token (Ops onboarding)' })
  async issueToken(@Param('driverId') driverId: string) {
    const token = await this.jwt.signAsync(
      { sub: driverId, typ: 'driver' },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: '12h' },
    );
    return { driverToken: token };
  }
}
