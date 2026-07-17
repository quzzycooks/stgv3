import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsString, IsUUID, Length } from 'class-validator';
import { BreakoutRole } from '../../database/enums';

export class SendMessageDto {
  @ApiProperty() @IsString() @Length(1, 2000) content: string;
}

export class AcceptRoleDto {
  @ApiProperty({ enum: BreakoutRole }) @IsEnum(BreakoutRole) role: BreakoutRole;
}

export class ModerateDto {
  @ApiProperty() @IsUUID() targetUserId: string;
  @ApiProperty({ enum: ['MUTE', 'UNMUTE', 'REMOVE', 'FLAG'] })
  @IsIn(['MUTE', 'UNMUTE', 'REMOVE', 'FLAG'])
  action: 'MUTE' | 'UNMUTE' | 'REMOVE' | 'FLAG';
}

export class AiQueryDto {
  @ApiProperty() @IsString() @Length(1, 1000) question: string;
}
