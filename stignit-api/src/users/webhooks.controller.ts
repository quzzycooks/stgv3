import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { EmergencyContactsService } from './emergency-contacts.service';

class InboundSmsDto {
  @IsString() from: string;
  @IsString() @IsOptional() text?: string;
  @IsString() @IsOptional() message?: string;
}

/**
 * Inbound SMS webhook (PRD 6.1.3 — contacts reply SAFE/CALL ME/NEED HELP or STOP).
 * Public because the SMS provider calls it, but MUST be protected by provider
 * signature verification in production (TODO: verify Termii signature header).
 */
@ApiTags('webhooks')
@Controller({ path: 'webhooks/sms', version: '1' })
export class SmsWebhookController {
  constructor(private readonly contacts: EmergencyContactsService) {}

  @Public()
  @Post('inbound')
  @HttpCode(200)
  @ApiOperation({ summary: 'Termii inbound SMS callback' })
  inbound(@Body() dto: InboundSmsDto) {
    return this.contacts.handleInboundSms(dto.from, dto.text ?? dto.message ?? '');
  }
}
