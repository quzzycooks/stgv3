import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { incidentParticipants, incidents } from '../database/schema';
import { first } from '../database/util';

/**
 * Situation Room access control (PRD 6.5.5), derived from the DB at request
 * time — the triggering user or a participant may view; everyone else denied.
 */
@Injectable()
export class IncidentAccessGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const incidentId: string = req.params?.incidentId ?? req.params?.id;
    if (!incidentId) throw new ForbiddenException('No incident specified');

    const incident = first(
      await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1),
    );
    if (!incident) throw new ForbiddenException('Incident not found');

    const participant = first(
      await this.db
        .select()
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
        .limit(1),
    );
    if (!participant && incident.triggeringUserId !== userId) {
      throw new ForbiddenException('Not authorized for this incident');
    }
    req.incident = incident;
    req.participant = participant;
    return true;
  }
}
