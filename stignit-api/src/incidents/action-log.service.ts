import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ActionType } from '../database/enums';
import { incidentActionLogs } from '../database/schema';

/**
 * Append-only writer for the Incident DNA action trail (PRD 6.9). Every material
 * event is logged with a timestamp; actor identities are anonymized at close.
 */
@Injectable()
export class ActionLogService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async log(
    incidentId: string,
    actionType: ActionType,
    payload: Record<string, unknown> = {},
    actorSessionToken?: string,
  ): Promise<void> {
    await this.db.insert(incidentActionLogs).values({
      incidentId,
      actionType,
      actionPayload: payload,
      actorSessionToken: actorSessionToken ?? null,
    });
  }
}
