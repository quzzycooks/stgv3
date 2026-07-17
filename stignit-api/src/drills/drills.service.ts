import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, notInArray, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccessLevel, DrillCategory, DrillOptionKind } from '../database/enums';
import {
  drillResponses,
  drillScenarios,
  drillSessions,
  users,
  type DrillScenario,
} from '../database/schema';
import { first } from '../database/util';
import { NotificationService } from '../notification/notification.service';
import { computeAccessLevel } from './drill-tier';

interface DrillOption {
  id: string;
  text: string;
  kind: DrillOptionKind;
  explanation: string;
}

const GAMING_MIN_MS = 5000; // PRD 6.2.4

@Injectable()
export class DrillsService {
  private readonly logger = new Logger(DrillsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly notifications: NotificationService,
  ) {}

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async startSession(userId: string, category?: DrillCategory) {
    const scenario = await this.pickScenario(userId, category);
    if (!scenario) throw new NotFoundException('No scenarios available');

    const options = scenario.options as DrillOption[];
    const optionOrder = this.shuffle(options.map((o) => o.id));
    const [session] = await this.db
      .insert(drillSessions)
      .values({ userId, scenarioId: scenario.id, optionOrder })
      .returning();

    const orderedOptions = optionOrder.map((id) => {
      const opt = options.find((o) => o.id === id)!;
      return { id: opt.id, text: opt.text };
    });
    return {
      sessionId: session.id,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        category: scenario.category,
        difficulty: scenario.difficulty,
        prompt: scenario.prompt,
        options: orderedOptions,
      },
    };
  }

  private async pickScenario(userId: string, category?: DrillCategory): Promise<DrillScenario | null> {
    const passed = await this.passedScenarioIds(userId);
    const base = (extraCategory?: DrillCategory): SQL[] => {
      const conds: SQL[] = [eq(drillScenarios.active, true)];
      const cat = extraCategory ?? category;
      if (cat) conds.push(eq(drillScenarios.category, cat));
      if (passed.length) conds.push(notInArray(drillScenarios.id, passed));
      return conds;
    };

    if (!category) {
      const weak = await this.weakestCategory(userId);
      if (weak) {
        const weakScenario = first(
          await this.db.select().from(drillScenarios).where(and(...base(weak))).limit(1),
        );
        if (weakScenario) return weakScenario;
      }
    }
    return first(
      await this.db.select().from(drillScenarios).where(and(...base())).orderBy(asc(drillScenarios.difficulty)).limit(1),
    );
  }

  async submitResponse(
    userId: string,
    sessionId: string,
    chosenOptionId: string,
    timeToDecisionMs: number,
    hesitationEvents: number,
  ) {
    const session = first(await this.db.select().from(drillSessions).where(eq(drillSessions.id, sessionId)).limit(1));
    if (!session || session.userId !== userId) throw new NotFoundException('Session not found');
    if (session.completed) throw new BadRequestException('Session already completed');

    const scenario = first(await this.db.select().from(drillScenarios).where(eq(drillScenarios.id, session.scenarioId)).limit(1));
    if (!scenario) throw new NotFoundException('Scenario not found');
    const options = scenario.options as DrillOption[];
    const chosen = options.find((o) => o.id === chosenOptionId);
    if (!chosen) throw new BadRequestException('Invalid option');

    const correct = chosen.kind === DrillOptionKind.CORRECT;
    const gamingFlagged = timeToDecisionMs < GAMING_MIN_MS;

    await this.db.insert(drillResponses).values({
      sessionId,
      userId,
      scenarioId: scenario.id,
      category: scenario.category,
      chosenOptionId,
      correct,
      timeToDecisionMs,
      hesitationEvents,
      gamingFlagged,
    });
    await this.db.update(drillSessions).set({ completed: true, completedAt: new Date() }).where(eq(drillSessions.id, sessionId));

    const { level, pct } = await this.recalcTier(userId);
    return {
      correct,
      pointsEarned: correct ? scenario.points : 0,
      explanation: chosen.explanation,
      correctOptionId: options.find((o) => o.kind === DrillOptionKind.CORRECT)?.id,
      accessLevel: level,
      completionPct: Math.round(pct * 100),
      gamingFlagged,
      weakCategories: await this.weakCategories(userId),
    };
  }

  private async passedScenarioIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ scenarioId: drillResponses.scenarioId })
      .from(drillResponses)
      .where(and(eq(drillResponses.userId, userId), eq(drillResponses.correct, true)));
    return rows.map((r) => r.scenarioId);
  }

  async recalcTier(userId: string): Promise<{ level: AccessLevel; pct: number }> {
    const passed = await this.passedScenarioIds(userId);
    const [{ total }] = await this.db.select({ total: count() }).from(drillScenarios).where(eq(drillScenarios.active, true));
    const user = first(
      await this.db.select({ skillVerified: users.skillVerified }).from(users).where(eq(users.id, userId)).limit(1),
    );
    const { level, pct } = computeAccessLevel(passed.length, Number(total), user?.skillVerified ?? false);
    await this.db.update(users).set({ accessLevel: level, drillCompletionPct: pct }).where(eq(users.id, userId));
    return { level, pct };
  }

  private async weakCategories(userId: string): Promise<DrillCategory[]> {
    const rows = await this.db.select().from(drillResponses).where(eq(drillResponses.userId, userId));
    const byCat = new Map<string, { wrong: number; total: number; hesitation: number }>();
    for (const r of rows) {
      const s = byCat.get(r.category) ?? { wrong: 0, total: 0, hesitation: 0 };
      s.total++;
      if (!r.correct) s.wrong++;
      s.hesitation += r.hesitationEvents;
      byCat.set(r.category, s);
    }
    const weak: DrillCategory[] = [];
    for (const [cat, s] of byCat) {
      if (s.total >= 2 && (s.wrong / s.total > 0.4 || s.hesitation / s.total > 2)) weak.push(cat as DrillCategory);
    }
    return weak;
  }

  private async weakestCategory(userId: string): Promise<DrillCategory | null> {
    return (await this.weakCategories(userId))[0] ?? null;
  }

  /** PRD 6.2.6: recalc all users on scenario change; notify anyone downgraded. */
  async recalcOnScenarioChange(): Promise<void> {
    const all = await this.db.select({ id: users.id, accessLevel: users.accessLevel }).from(users);
    for (const u of all) {
      const before = u.accessLevel as AccessLevel;
      const { level } = await this.recalcTier(u.id);
      if (level !== before && this.rank(level) < this.rank(before)) {
        await this.notifications.enqueue({
          channel: 'push',
          target: `user:${u.id}`,
          title: 'New drills available',
          body: 'New scenarios were added — complete a few more to keep your responder tier.',
        });
      }
    }
  }

  private rank(l: AccessLevel): number {
    return { OBSERVER: 0, TIER1: 1, TIER2: 2, SKILLED: 3 }[l];
  }

  // --- Admin scenario management (PRD 6.2.6) ---
  async createScenario(data: {
    title: string;
    category: DrillCategory;
    difficulty: any;
    prompt: string;
    options: DrillOption[];
    points?: number;
  }): Promise<DrillScenario> {
    const options = data.options.map((o) => ({ ...o, id: o.id ?? randomUUID() }));
    const [scenario] = await this.db
      .insert(drillScenarios)
      .values({ ...data, options, points: data.points ?? 50 })
      .returning();
    await this.recalcOnScenarioChange();
    return scenario;
  }

  listScenarios(): Promise<DrillScenario[]> {
    return this.db.select().from(drillScenarios).orderBy(drillScenarios.createdAt);
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await this.db.update(drillScenarios).set({ active }).where(eq(drillScenarios.id, id));
    await this.recalcOnScenarioChange();
  }
}
