import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConsentCategory, ProfessionalSkill } from '../../database/enums';

export class EmergencyContactInput {
  @ApiProperty() @IsString() @Length(1, 255) name: string;
  @ApiProperty() @IsString() @Length(10, 20) phone: string;
  @ApiProperty() @IsString() @Length(1, 100) relationship: string;
  @ApiProperty() @IsOptional() @Min(1) @Max(4) priority?: number;
}

export class MedicalInfoInput {
  @ApiPropertyOptional() @IsOptional() @IsString() bloodType?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() conditions?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() medications?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() allergies?: string[];
}

export class ConsentInput {
  @ApiProperty({ enum: ConsentCategory }) @IsEnum(ConsentCategory) category: ConsentCategory;
  @ApiProperty() @IsBoolean() granted: boolean;
}

export class RegisterDto {
  @ApiProperty() @IsString() @Length(2, 255) fullName: string;
  @ApiProperty({ example: '1998-05-12' }) @IsISO8601() dateOfBirth: string;
  @ApiProperty() @IsString() @Length(2, 100) stateLga: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profilePhotoUrl?: string;

  @ApiProperty({ type: [EmergencyContactInput], description: 'PRD 6.1.1: min 2, max 4' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactInput)
  emergencyContacts: EmergencyContactInput[];

  @ApiPropertyOptional({ type: MedicalInfoInput })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalInfoInput)
  medicalInfo?: MedicalInfoInput;

  @ApiPropertyOptional({ type: [ConsentInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentInput)
  consents?: ConsentInput[];
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 255) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 100) stateLga?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profilePhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Min(30) @Max(600) welfareCheckDelaySec?: number;
  @ApiPropertyOptional({ type: MedicalInfoInput })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalInfoInput)
  medicalInfo?: MedicalInfoInput;
}

export class SubmitSkillDto {
  @ApiProperty({ enum: ProfessionalSkill }) @IsEnum(ProfessionalSkill) skill: ProfessionalSkill;
  @ApiProperty() @IsString() documentUrl: string;
}
