import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { EncryptionService } from '../common/crypto/encryption.service';
import { normalizeNigerianPhone } from '../common/phone.util';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccessLevel, AccountStatus } from '../database/enums';
import { users } from '../database/schema';
import { first } from '../database/util';
import { OtpService, OtpRequestResult } from './otp.service';
import { TokenPair, TokenService } from './token.service';

export interface VerifyResult extends TokenPair {
  userId: string;
  accessLevel: AccessLevel;
  registrationComplete: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly encryption: EncryptionService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async requestOtp(phone: string): Promise<OtpRequestResult> {
    const e164 = normalizeNigerianPhone(phone);
    return this.otp.request(this.encryption.blindIndex(e164), e164);
  }

  async verifyOtp(phone: string, code: string): Promise<VerifyResult> {
    const e164 = normalizeNigerianPhone(phone);
    const phoneHash = this.encryption.blindIndex(e164);

    const res = await this.otp.verify(phoneHash, code);
    if (!res.ok) {
      const msg =
        res.reason === 'locked'
          ? 'Too many attempts — try again later'
          : res.reason === 'no_otp' || res.reason === 'expired'
            ? 'OTP expired or not requested'
            : 'Incorrect code';
      throw new UnauthorizedException(msg);
    }

    // Resolve or create the phone-verified identity (PRD 6.1.1).
    let user = first(await this.db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1));
    let registrationComplete = true;
    if (!user) {
      user = first(
        await this.db
          .insert(users)
          .values({
            phoneHash,
            phoneNumber: e164, // encrypted by the column customType
            fullName: '',
            dateOfBirth: '',
            accessLevel: AccessLevel.OBSERVER,
            accountStatus: AccountStatus.INCOMPLETE,
          })
          .returning(),
      )!;
      registrationComplete = false;
    } else {
      registrationComplete = user.accountStatus !== AccountStatus.INCOMPLETE;
      await this.db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));
    }

    const pair = await this.tokens.issuePair(user.id, user.accessLevel as AccessLevel);
    return { ...pair, userId: user.id, accessLevel: user.accessLevel as AccessLevel, registrationComplete };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.rotate(refreshToken, async (userId) => {
      const user = first(
        await this.db
          .select({ accessLevel: users.accessLevel, accountStatus: users.accountStatus })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
      );
      if (!user || user.accountStatus === AccountStatus.DELETED) {
        throw new UnauthorizedException('Account not found');
      }
      return user.accessLevel as AccessLevel;
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeByRefresh(refreshToken);
  }
}
