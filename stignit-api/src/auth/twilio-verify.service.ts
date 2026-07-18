import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

interface TwilioVerificationResponse {
  status?: string;
  message?: string;
}

/**
 * Delivers OTP codes via Twilio Verify's CustomCode parameter (PRD 6.1.1/11.2).
 * We keep our own code generation, hashing, and lockout logic (otp.service.ts) —
 * Twilio Verify is used purely as the SMS transport here, not as the source of
 * truth for verification, so no Verification Check call is needed.
 */
@Injectable()
export class TwilioVerifyService {
  private readonly logger = new Logger(TwilioVerifyService.name);
  constructor(private readonly config: ConfigService) {}

  async sendCode(to: string, code: string): Promise<void> {
    return withRetry(
      async () => {
        const accountSid = this.config.get<string>('integrations.twilioAccountSid');
        const authToken = this.config.get<string>('integrations.twilioAuthToken');
        const serviceSid = this.config.get<string>('integrations.twilioVerifyServiceSid');

        if (!accountSid || !authToken || !serviceSid) {
          // Dev/test: no provider configured — simulate a successful send.
          this.logger.debug(`[Verify stub] to=${to} code=${code}`);
          return;
        }

        const res = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({ To: to, Channel: 'sms', CustomCode: code }).toString(),
        });

        const data = (await res.json().catch(() => ({}))) as TwilioVerificationResponse;
        if (!res.ok) {
          throw new Error(`Twilio Verify send failed (${res.status}): ${data.message ?? 'unknown error'}`);
        }

        this.logger.debug(`[Verify] to=${to} status=${data.status}`);
      },
      { label: 'twilioVerify.sendCode' },
    );
  }
}
