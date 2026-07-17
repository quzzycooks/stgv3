import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { DrillCategory, DrillDifficulty, DrillOptionKind } from '../../database/enums';

export class StartSessionDto {
  @ApiPropertyOptional({ enum: DrillCategory })
  @IsOptional()
  @IsEnum(DrillCategory)
  category?: DrillCategory;
}

export class SubmitResponseDto {
  @ApiProperty() @IsString() chosenOptionId: string;
  @ApiProperty({ description: 'ms from prompt shown to choice (adaptive learning)' })
  @IsInt()
  @Min(0)
  timeToDecisionMs: number;
  @ApiProperty({ description: 'pauses >3s before choosing (PRD 6.2.4)' })
  @IsInt()
  @Min(0)
  hesitationEvents: number;
}

class DrillOptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() text: string;
  @ApiProperty({ enum: DrillOptionKind }) @IsEnum(DrillOptionKind) kind: DrillOptionKind;
  @ApiProperty() @IsString() explanation: string;
}

export class CreateScenarioDto {
  @ApiProperty() @IsString() @Length(3, 200) title: string;
  @ApiProperty({ enum: DrillCategory }) @IsEnum(DrillCategory) category: DrillCategory;
  @ApiProperty({ enum: DrillDifficulty }) @IsEnum(DrillDifficulty) difficulty: DrillDifficulty;
  @ApiProperty() @IsString() prompt: string;
  @ApiProperty({ type: [DrillOptionDto] })
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => DrillOptionDto)
  options: DrillOptionDto[];
  @ApiPropertyOptional() @IsOptional() @IsInt() points?: number;
}

export class SetActiveDto {
  @ApiProperty() @IsBoolean() active: boolean;
}
