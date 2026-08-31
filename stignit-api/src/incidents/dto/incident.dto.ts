import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { IncidentStatus, IncidentType, ReporterRole } from '../../database/enums';

export class GpsDto {
  @ApiProperty() @IsLatitude() lat: number;
  @ApiProperty() @IsLongitude() lng: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() accuracyMeters?: number;
}

/** How the client obtained (or failed to obtain) the GPS fix sent with the trigger. */
export type LocationSource = 'fresh' | 'cached' | 'unavailable';

export class ManualTriggerDto {
  @ApiProperty({ enum: IncidentType }) @IsEnum(IncidentType) incidentType: IncidentType;
  @ApiPropertyOptional({
    type: GpsDto,
    description:
      'Omitted when no fix (fresh or cached) was available — the SOS trigger must never block on GPS.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GpsDto)
  gps?: GpsDto;
  @ApiPropertyOptional({ description: 'Client event time (offline sync anchor)' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
  @ApiPropertyOptional({
    enum: ReporterRole,
    description: 'WITNESS = bystander reporting someone else; INVOLVED = reporting for self. Defaults to INVOLVED.',
  })
  @IsOptional()
  @IsEnum(ReporterRole)
  reporterRole?: ReporterRole;
  @ApiPropertyOptional({
    description: 'Telemetry: how the accompanying gps fix (if any) was obtained.',
    enum: ['fresh', 'cached', 'unavailable'],
  })
  @IsOptional()
  @IsIn(['fresh', 'cached', 'unavailable'])
  locationSource?: LocationSource;
}

export class ConfirmProximityDto {
  @ApiProperty({ description: 'true = I am here and safe; false = not at location' })
  @IsBoolean()
  present: boolean;
}

export class TransitionDto {
  @ApiProperty({ enum: IncidentStatus }) @IsEnum(IncidentStatus) to: IncidentStatus;
  @ApiPropertyOptional() @IsOptional() reason?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ type: GpsDto }) @ValidateNested() @Type(() => GpsDto) gps: GpsDto;
}
