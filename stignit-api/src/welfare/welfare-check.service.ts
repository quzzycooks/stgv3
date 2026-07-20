import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, between, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ActionType, IncidentStatus, IncidentType, ReporterRole, TriggerType } from '../database/enums';
import { incidents, users, type Incident } from '../database/schema';
import { first } from '../database/util';
import { ActionLogService } from '../incidents/action-log.service';
import { SituationRoomService } from '../incidents/situation-room.service';
import { NotificationService } from '../notification/notification.service';
import { WELFARE_QUEUE } from '../messaging/queue.tokens';
import { REDIS_CLIENT } from '../redis/redis.module';

type WelfareState = 'PROMPT1' | 'PROMPT2' | 'RESOLVED';
interface WelfareSession {
  id: string;
  userId: string;
  gps: { lat: number; lng: number; accuracyMeters?: number };
  incidentTypeHint: IncidentType;
  state: WelfareState;
  delaySec: number;
  occurredAt: string;
}

const PROMPT2_WINDOW_MS = 60_000;
const CANCEL_WINDOW_MS = 30_000;

/**
 * Welfare Check state machine (PRD 6.4). triggered → PROMPT1 → (SAFE |
 * NEED_HELP | timeout → PROMPT2) → (timeout → escalation). Timers are BullMQ
 * delayed jobs; a response flips session state so a late timer no-ops.
 */
@Injectable()
export class WelfareCheckService {
  private readonly logger = new Logger(WelfareCheckService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly rooms: SituationRoomService,
    private readonly notifications: NotificationService,
    private readonly actionLog: ActionLogService,
    @InjectQueue(WELFARE_QUEUE) private readonly queue: Queue,
  ) {}

  private key(id: string) {
    return `wc:${id}`;
  }
  private async save(s: WelfareSession) {
    await this.redis.set(this.key(s.id), JSON.stringify(s), 'EX', s.delaySec + 300);
  }
  private async load(id: string): Promise<WelfareSession | null> {
    const raw = await this.redis.get(this.key(id));
    return raw ? (JSON.parse(raw) as WelfareSession) : null;
  }

  async initiate(
    userId: string,
    gps: WelfareSession['gps'],
    incidentTypeHint: IncidentType = IncidentType.UNKNOWN,
    occurredAt = new Date(),
  ): Promise<{ sessionId: string }> {
    const user = first(
      await this.db.select({ welfareCheckDelaySec: users.welfareCheckDelaySec }).from(users).where(eq(users.id, userId)).limit(1),
    );
    const delaySec = user?.welfareCheckDelaySec ?? 120;

    const session: WelfareSession = {
      id: randomUUID(),
      userId,
      gps,
      incidentTypeHint,
      state: 'PROMPT1',
      delaySec,
      occurredAt: occurredAt.toISOString(),
    };
    await this.save(session);
    await this.sendPrompt(session, 1);
    await this.queue.add('prompt2', { sessionId: session.id }, { delay: delaySec * 1000, jobId: `p2:${session.id}` });
    return { sessionId: session.id };
  }

  async respond(
    sessionId: string,
    userId: string,
    response: 'SAFE' | 'NEED_HELP',
  ): Promise<{ incidentId?: string }> {
    const session = await this.load(sessionId);
    if (!session || session.state === 'RESOLVED') return {};
    if (session.userId !== userId) throw new BadRequestException('Not your welfare check');

    session.state = 'RESOLVED';
    await this.save(session);

    if (response === 'SAFE') {
      this.logger.debug(`Welfare ${sessionId} resolved SAFE`);
      return {};
    }
    const incident = await this.escalate(session, false);
    return { incidentId: incident.incidentId };
  }

  async onPrompt2Timeout(sessionId: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session || session.state !== 'PROMPT1') return;
    session.state = 'PROMPT2';
    await this.save(session);
    await this.sendPrompt(session, 2);
    await this.queue.add('escalate', { sessionId }, { delay: PROMPT2_WINDOW_MS, jobId: `esc:${sessionId}` });
  }

  async onEscalateTimeout(sessionId: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session || session.state !== 'PROMPT2') return;
    session.state = 'RESOLVED';
    await this.save(session);
    await this.escalate(session, true);
  }

  private async escalate(session: WelfareSession, observerMode: boolean): Promise<Incident> {
    const incident = await this.rooms.create({
      triggerType: TriggerType.WELFARE_ESCALATION,
      incidentType: session.incidentTypeHint,
      triggeringUserId: session.userId,
      gps: session.gps,
      occurredAt: new Date(session.occurredAt),
      observerMode,
      reporterRole: ReporterRole.INVOLVED,
    });
    await this.actionLog.log(incident.incidentId, ActionType.ESCALATION_STARTED, { observerMode });
    return incident;
  }

  async cancel(incidentId: string, userId: string): Promise<{ cancelled: boolean; reviewSuggested: boolean }> {
    const incident = first(
      await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1),
    );
    if (!incident) throw new BadRequestException('Incident not found');
    if (incident.triggeringUserId !== userId) throw new BadRequestException('Only the triggering user may cancel');
    if (incident.status !== IncidentStatus.ACTIVE) throw new BadRequestException('Incident can no longer be cancelled');
    if (Date.now() - incident.createdAt.getTime() > CANCEL_WINDOW_MS) {
      throw new BadRequestException('Cancellation window (30s) has elapsed');
    }

    await this.rooms.transition(incidentId, IncidentStatus.FALSE_ALARM, { reason: 'user_cancelled' });
    await this.notifications.enqueue({
      channel: 'sms',
      to: `user:${userId}`,
      body: 'False alarm — the earlier Stignit alert has been cancelled by the user.',
    });

    const reviewSuggested = (await this.falseAlarmCount(userId)) > 5;
    return { cancelled: true, reviewSuggested };
  }

  async falseAlarmCount(userId: string, now = new Date()): Promise<number> {
    const from = new Date(now.getTime() - 30 * 86400_000);
    const [{ c }] = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(incidents)
      .where(
        and(
          eq(incidents.triggeringUserId, userId),
          eq(incidents.status, IncidentStatus.FALSE_ALARM),
          between(incidents.createdAt, from, now),
        ),
      );
    return Number(c);
  }

  private async sendPrompt(session: WelfareSession, which: 1 | 2): Promise<void> {
    await this.notifications.enqueue({
      channel: 'push',
      target: `user:${session.userId}`,
      title: which === 1 ? 'Are you safe?' : 'Are you safe? (final check)',
      body: 'Stignit detected an unusual movement pattern. Please confirm you are okay.',
    });
  }

  /** Offline sync (PRD 6.4.3): anchor timeline to original client time. */
  async syncOfflineNeedHelp(
    userId: string,
    gps: WelfareSession['gps'],
    incidentType: IncidentType,
    occurredAt: Date,
  ): Promise<Incident> {
    const now = new Date();
    const incident = await this.rooms.create({
      triggerType: TriggerType.WELFARE_ESCALATION,
      incidentType,
      triggeringUserId: userId,
      gps,
      occurredAt,
      observerMode: false,
      reporterRole: ReporterRole.INVOLVED,
      syncedAt: now,
    });
    await this.actionLog.log(incident.incidentId, ActionType.ESCALATION_STARTED, {
      offlineSync: true,
      syncDelaySec: Math.round((now.getTime() - occurredAt.getTime()) / 1000),
    });
    return incident;
  }
}
