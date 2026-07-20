import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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

export class ManualTriggerDto {
  @ApiProperty({ enum: IncidentType }) @IsEnum(IncidentType) incidentType: IncidentType;
  @ApiProperty({ type: GpsDto }) @ValidateNested() @Type(() => GpsDto) gps: GpsDto;
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
