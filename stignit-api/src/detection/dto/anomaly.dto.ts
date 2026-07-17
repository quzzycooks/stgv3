import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { IncidentType } from '../../database/enums';
import { GpsDto } from '../../incidents/dto/incident.dto';

/**
 * Composite anomaly report from the ON-DEVICE detection engine (PRD 6.3).
 *
 * PRIVACY (PRD 6.3.3): this contract has NO field for audio. Raw audio is
 * structurally impossible to submit — the global ValidationPipe runs with
 * forbidNonWhitelisted, so any extra field (e.g. `audio`) is rejected outright.
 * Only a scalar amplitude-spike FLAG may be reported, never samples.
 */
export class AnomalyReportDto {
  @ApiProperty({
    minimum: 0,
    maximum: 1,
    description: 'Composite anomaly score',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  compositeScore: number;

  @ApiProperty({ type: GpsDto })
  @ValidateNested()
  @Type(() => GpsDto)
  gps: GpsDto;

  @ApiPropertyOptional({
    enum: IncidentType,
    description: 'On-device inferred type, if any',
  })
  @IsOptional()
  @IsEnum(IncidentType)
  incidentTypeHint?: IncidentType;

  @ApiPropertyOptional({ description: 'On-device speed (km/h) at event' })
  @IsOptional()
  @IsNumber()
  speedKph?: number;

  @ApiPropertyOptional({
    description: 'Amplitude-spike detected flag (NOT audio, PRD 6.3.3)',
  })
  @IsOptional()
  amplitudeSpike?: boolean;
}
