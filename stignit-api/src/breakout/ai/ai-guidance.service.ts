import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../../database/drizzle.module';
import { AccessLevel, ActionType, IncidentType } from '../../database/enums';
import { incidentParticipants, incidents, users } from '../../database/schema';
import { first } from '../../database/util';
import { ActionLogService } from '../../incidents/action-log.service';
import { OPEN_STATES } from '../../incidents/incident-lifecycle';
import { AI_PROVIDER } from './ai-provider';
import type { AiProvider } from './ai-provider';
import { GUIDANCE_DISCLAIMER, SAFE_FALLBACK, checkAiOutput } from './ai-safety.filter';

export interface GuidanceResult {
  answer: string;
  guidanceOnly: true;
  filtered: boolean;
}

/**
 * AI Support Engine (PRD 6.11). Enforces server-side: Tier1+ participant in an
 * OPEN incident; medical context only if a verified Skilled Responder is in the
 * room; output safety filter (violation → discard + safe fallback); DNA logging.
 */
@Injectable()
export class AiGuidanceService {
  private readonly logger = new Logger(AiGuidanceService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly actionLog: ActionLogService,
  ) {}

  async query(incidentId: string, userId: string, question: string): Promise<GuidanceResult> {
    const incident = first(
      await this.db
        .select({ status: incidents.status, incidentType: incidents.incidentType })
        .from(incidents)
        .where(eq(incidents.incidentId, incidentId))
        .limit(1),
    );
    if (!incident || !OPEN_STATES.includes(incident.status as any)) {
      throw new ForbiddenException('AI guidance is only available in an active incident');
    }

    const me = first(
      await this.db.select({ accessLevel: users.accessLevel }).from(users).where(eq(users.id, userId)).limit(1),
    );
    const membership = first(
      await this.db
        .select({ id: incidentParticipants.id })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
        .limit(1),
    );
    if (!me || !membership) {
      throw new ForbiddenException('Join the breakout room to use AI guidance');
    }

    const skilledPresent = await this.hasVerifiedSkilledResponder(incidentId);
    const medicalContext = skilledPresent ? '(medical context available to responder)' : undefined;

    let raw: string;
    try {
      raw = await this.provider.generate({
        incidentType: incident.incidentType as IncidentType,
        question,
        medicalContext,
      });
    } catch (err) {
      this.logger.warn(`AI provider failed, returning fallback: ${(err as Error).message}`);
      raw = SAFE_FALLBACK;
    }

    const check = checkAiOutput(raw);
    const filtered = !check.safe;
    const answer = filtered ? SAFE_FALLBACK : raw;
    if (filtered) {
      this.logger.error(`AI output violated ${check.violations.join(',')} — replaced with fallback`);
    }

    await this.actionLog.log(incidentId, ActionType.AI_QUERY, {
      userId,
      question,
      filtered,
      violations: check.violations,
      medicalContextIncluded: !!medicalContext,
    });

    return { answer: `${answer}\n\n${GUIDANCE_DISCLAIMER}`, guidanceOnly: true, filtered };
  }

  private async hasVerifiedSkilledResponder(incidentId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: incidentParticipants.id })
      .from(incidentParticipants)
      .innerJoin(users, eq(users.id, incidentParticipants.userId))
      .where(
        and(
          eq(incidentParticipants.incidentId, incidentId),
          isNotNull(incidentParticipants.joinedBreakoutAt),
          isNull(incidentParticipants.leftBreakoutAt),
          eq(users.accessLevel, AccessLevel.SKILLED),
          eq(users.skillVerified, true),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}
