import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AdminIdTokenVerifier } from './admin-identity';

/**
 * Verifies Google Workspace ID tokens for admin SSO (PRD 11.2 — admin auth is
 * separate from the mobile app and shares no credentials). The client is
 * created lazily so the app boots without SSO configured in dev.
 */
@Injectable()
export class GoogleIdTokenVerifier implements AdminIdTokenVerifier {
  private readonly logger = new Logger(GoogleIdTokenVerifier.name);
  private client?: OAuth2Client;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OAuth2Client {
    const clientId = this.config.get<string>('adminSso.clientId');
    if (!clientId) throw new UnauthorizedException('Admin SSO not configured');
    return (this.client ??= new OAuth2Client(clientId));
  }

  async verify(idToken: string): Promise<{ email: string; hostedDomain?: string }> {
    try {
      const ticket = await this.getClient().verifyIdToken({
        idToken,
        audience: this.config.get<string>('adminSso.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.email_verified) {
        throw new UnauthorizedException('Unverified admin email');
      }
      return { email: payload.email.toLowerCase(), hostedDomain: payload.hd };
    } catch (err) {
      this.logger.warn(`Admin ID token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid admin SSO token');
    }
  }
}
