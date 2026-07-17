import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccessLevel, ActionType, BreakoutRole } from '../database/enums';
import {
  breakoutMessages,
  incidentParticipants,
  incidents,
  users,
  type BreakoutMessage,
  type IncidentParticipant,
} from '../database/schema';
import { first } from '../database/util';
import { ActionLogService } from '../incidents/action-log.service';
import { OPEN_STATES } from '../incidents/incident-lifecycle';
import { REDIS_CLIENT } from '../redis/redis.module';
import { isFlaggable } from './content-filter';

const MAX_ACTIVE = 50; // PRD 6.6.5
const RANK: Record<AccessLevel, number> = {
  [AccessLevel.OBSERVER]: 0,
  [AccessLevel.TIER1]: 1,
  [AccessLevel.TIER2]: 2,
  [AccessLevel.SKILLED]: 3,
};
const ROLE_MIN_TIER: Record<BreakoutRole, AccessLevel> = {
  [BreakoutRole.COORDINATOR]: AccessLevel.TIER2,
  [BreakoutRole.MEDICAL_LEAD]: AccessLevel.SKILLED,
  [BreakoutRole.TRANSPORT]: AccessLevel.TIER1,
  [BreakoutRole.SAFETY_MONITOR]: AccessLevel.TIER1,
  [BreakoutRole.INFO_OFFICER]: AccessLevel.TIER1,
  [BreakoutRole.OBSERVER]: AccessLevel.OBSERVER,
};

@Injectable()
export class BreakoutRoomService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly actionLog: ActionLogService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private muteKey(incidentId: string) {
    return `bk:mute:${incidentId}`;
  }

  private async assertOpenIncident(incidentId: string): Promise<void> {
    const incident = first(
      await this.db.select({ status: incidents.status }).from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1),
    );
    if (!incident) throw new NotFoundException('Incident not found');
    if (!OPEN_STATES.includes(incident.status as any)) throw new BadRequestException('Incident is not active');
  }

  private async membershipOrThrow(incidentId: string, userId: string): Promise<IncidentParticipant> {
    const p = first(
      await this.db
        .select()
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
        .limit(1),
    );
    if (!p) throw new ForbiddenException('Not a participant in this incident');
    return p;
  }

  private async currentTier(userId: string): Promise<AccessLevel> {
    const u = first(
      await this.db.select({ accessLevel: users.accessLevel }).from(users).where(eq(users.id, userId)).limit(1),
    );
    return (u?.accessLevel as AccessLevel) ?? AccessLevel.OBSERVER;
  }

  async join(incidentId: string, userId: string): Promise<{ role: BreakoutRole | null; readOnly: boolean }> {
    await this.assertOpenIncident(incidentId);
    const participant = await this.membershipOrThrow(incidentId, userId);
    const tier = await this.currentTier(userId);

    const [{ c }] = await this.db
      .select({ c: count() })
      .from(incidentParticipants)
      .where(
        and(
          eq(incidentParticipants.incidentId, incidentId),
          isNotNull(incidentParticipants.joinedBreakoutAt),
          isNull(incidentParticipants.leftBreakoutAt),
        ),
      );
    const readOnly = tier === AccessLevel.OBSERVER || Number(c) >= MAX_ACTIVE;

    const role = readOnly && !participant.breakoutRoomRole ? BreakoutRole.OBSERVER : participant.breakoutRoomRole;
    await this.db
      .update(incidentParticipants)
      .set({ joinedBreakoutAt: new Date(), leftBreakoutAt: null, breakoutRoomRole: role })
      .where(eq(incidentParticipants.id, participant.id));

    if (!readOnly) await this.maybeAutoAssignModerator(incidentId, participant.id, userId, tier);
    return { role: (role as BreakoutRole) ?? null, readOnly };
  }

  private async maybeAutoAssignModerator(
    incidentId: string,
    participantId: string,
    userId: string,
    tier: AccessLevel,
  ): Promise<void> {
    const existing = first(
      await this.db
        .select({ id: incidentParticipants.id })
        .from(incidentParticipants)
        .where(
          and(
            eq(incidentParticipants.incidentId, incidentId),
            eq(incidentParticipants.isModerator, true),
            isNull(incidentParticipants.leftBreakoutAt),
          ),
        )
        .limit(1),
    );
    if (!existing && RANK[tier] >= RANK[AccessLevel.TIER1]) {
      await this.db.update(incidentParticipants).set({ isModerator: true }).where(eq(incidentParticipants.id, participantId));
      await this.actionLog.log(incidentId, ActionType.MODERATOR_ACTION, { auto: true, userId });
    }
  }

  async sendMessage(incidentId: string, userId: string, content: string): Promise<BreakoutMessage> {
    await this.assertOpenIncident(incidentId);
    const participant = await this.membershipOrThrow(incidentId, userId);
    const tier = await this.currentTier(userId); // re-derived from DB (PRD 11.2)
    if (RANK[tier] < RANK[AccessLevel.TIER1]) {
      throw new ForbiddenException('Observers cannot post — complete drills to unlock');
    }
    if (await this.redis.sismember(this.muteKey(incidentId), userId)) {
      throw new ForbiddenException('You are muted in this room');
    }
    const trimmed = content.trim();
    if (!trimmed) throw new BadRequestException('Empty message');

    const [message] = await this.db
      .insert(breakoutMessages)
      .values({
        incidentId,
        senderUserId: userId,
        senderRole: participant.breakoutRoomRole,
        content: trimmed,
        flagged: isFlaggable(trimmed),
      })
      .returning();
    await this.actionLog.log(incidentId, ActionType.MESSAGE, { messageId: message.id, flagged: message.flagged });
    return message;
  }

  getMessages(incidentId: string): Promise<BreakoutMessage[]> {
    return this.db
      .select()
      .from(breakoutMessages)
      .where(eq(breakoutMessages.incidentId, incidentId))
      .orderBy(breakoutMessages.createdAt);
  }

  async acceptRole(incidentId: string, userId: string, role: BreakoutRole): Promise<void> {
    await this.assertOpenIncident(incidentId);
    const participant = await this.membershipOrThrow(incidentId, userId);
    const tier = await this.currentTier(userId);

    if (role === BreakoutRole.MEDICAL_LEAD) {
      const u = first(
        await this.db
          .select({ skillVerified: users.skillVerified, accessLevel: users.accessLevel })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
      );
      if (!u?.skillVerified || u.accessLevel !== AccessLevel.SKILLED) {
        throw new ForbiddenException('Medical Lead requires a verified Skilled Responder');
      }
    } else if (RANK[tier] < RANK[ROLE_MIN_TIER[role]]) {
      throw new ForbiddenException(`Role ${role} requires ${ROLE_MIN_TIER[role]} or higher`);
    }

    await this.db.update(incidentParticipants).set({ breakoutRoomRole: role }).where(eq(incidentParticipants.id, participant.id));
    await this.actionLog.log(incidentId, ActionType.ROLE_ASSIGNED, { userId, role });
  }

  async ensureCoordinator(incidentId: string): Promise<void> {
    const hasCoordinator = first(
      await this.db
        .select({ id: incidentParticipants.id })
        .from(incidentParticipants)
        .where(
          and(
            eq(incidentParticipants.incidentId, incidentId),
            eq(incidentParticipants.breakoutRoomRole, BreakoutRole.COORDINATOR),
            isNull(incidentParticipants.leftBreakoutAt),
          ),
        )
        .limit(1),
    );
    if (hasCoordinator) return;

    const active = await this.db
      .select({ id: incidentParticipants.id, userId: incidentParticipants.userId })
      .from(incidentParticipants)
      .where(
        and(
          eq(incidentParticipants.incidentId, incidentId),
          isNotNull(incidentParticipants.joinedBreakoutAt),
          isNull(incidentParticipants.leftBreakoutAt),
        ),
      );
    let best: { id: string; tier: AccessLevel } | null = null;
    for (const p of active) {
      const tier = await this.currentTier(p.userId);
      if (!best || RANK[tier] > RANK[best.tier]) best = { id: p.id, tier };
    }
    if (best && RANK[best.tier] >= RANK[AccessLevel.TIER1]) {
      await this.db.update(incidentParticipants).set({ breakoutRoomRole: BreakoutRole.COORDINATOR }).where(eq(incidentParticipants.id, best.id));
      await this.actionLog.log(incidentId, ActionType.ROLE_ASSIGNED, {
        role: BreakoutRole.COORDINATOR,
        autoAssigned: true,
        professionalBackupRecommended: RANK[best.tier] < RANK[AccessLevel.TIER2],
      });
    }
  }

  async moderatorAction(
    incidentId: string,
    moderatorId: string,
    targetUserId: string,
    action: 'MUTE' | 'UNMUTE' | 'REMOVE' | 'FLAG',
  ): Promise<void> {
    const mod = await this.membershipOrThrow(incidentId, moderatorId);
    const modTier = await this.currentTier(moderatorId);
    if (!mod.isModerator && RANK[modTier] < RANK[AccessLevel.TIER2]) {
      throw new ForbiddenException('Moderator privileges required');
    }
    switch (action) {
      case 'MUTE':
        await this.redis.sadd(this.muteKey(incidentId), targetUserId);
        break;
      case 'UNMUTE':
        await this.redis.srem(this.muteKey(incidentId), targetUserId);
        break;
      case 'REMOVE':
        await this.db
          .update(incidentParticipants)
          .set({ leftBreakoutAt: new Date(), breakoutRoomRole: null })
          .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, targetUserId)));
        break;
      case 'FLAG':
        break;
    }
    await this.actionLog.log(incidentId, ActionType.MODERATOR_ACTION, { moderatorId, targetUserId, action });
  }
}
