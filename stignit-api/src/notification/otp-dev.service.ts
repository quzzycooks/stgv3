import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

const OTP_DEV_SEND_URL = 'https://api.otp.dev/v1/verifications';

interface OtpDevSendResponse {
  data?: { message_id?: string };
  errors?: { message?: string; code?: string }[];
}

/**
 * otp.dev (GetOTP) — OTP SMS transport. Confirmed live 2026-07-20 to actually
 * reach Nigerian phones, unlike Sendchamp's /sms/send, which reports success
 * for every call but silently drops delivery under the default sender name
 * regardless of route (see sms.service.ts doc comment for the full trail).
 *
 * We keep our own code generation/hashing/lockout (OtpService, Redis-backed)
 * unchanged — otp.dev is used purely as delivery by passing our own `code`
 * explicitly rather than letting it generate and hold the match itself.
 *
 * Requires a pre-created template (POST /v1/templates) with a `{code}`
 * placeholder, and an approved sender for the account. The default sender
 * name here ("OTP Dev") is a shared Nigeria-approved sender available
 * immediately; switch OTP_DEV_SENDER_NAME to "STIGNIT" once that custom
 * sender ID clears approval on the dashboard.
 */
@Injectable()
export class OtpDevService {
  private readonly logger = new Logger(OtpDevService.name);
  constructor(private readonly config: ConfigService) {}

  async sendCode(phoneE164: string, code: string): Promise<void> {
    const apiKey = this.config.get<string>('integrations.otpDevApiKey');
    const templateId = this.config.get<string>('integrations.otpDevTemplateId');
    const sender = this.config.get<string>('integrations.otpDevSenderName');
    if (!apiKey || !templateId) {
      // Dev/test: no provider configured — simulate a successful send.
      this.logger.debug(`[OTP.dev stub] to=${phoneE164}`);
      return;
    }

    await withRetry(
      async () => {
        const res = await fetch(OTP_DEV_SEND_URL, {
          method: 'POST',
          headers: {
            'X-OTP-Key': apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              channel: 'sms',
              sender,
              phone: phoneE164.replace(/^\+/, ''),
              template: templateId,
              code,
            },
          }),
        });

        const data = (await res.json().catch(() => ({}))) as OtpDevSendResponse;
        if (!res.ok || data.errors) {
          throw new Error(`otp.dev send failed (${res.status}): ${data.errors?.[0]?.message ?? JSON.stringify(data)}`);
        }

        this.logger.debug(`[OTP.dev] to=${phoneE164} message_id=${data.data?.message_id}`);
      },
      { label: 'otpdev.send' },
    );
  }
}
