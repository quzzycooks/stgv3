import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { IncidentType } from '../database/enums';
import { users } from '../database/schema';
import { first } from '../database/util';
import { WelfareCheckService } from '../welfare/welfare-check.service';
import { AnomalyReportDto } from './dto/anomaly.dto';

const DEFAULT_THRESHOLD = 0.72; // PRD 6.3.2
const RISK_ZONE_FACTOR = 0.85; // PRD 6.3.4: -15% in a risk zone

/**
 * Backend half of detection (PRD 6.3): applies the tunable threshold, lowers it
 * inside risk zones, and initiates the welfare-check flow. No raw sensor streams.
 */
@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly welfare: WelfareCheckService,
  ) {}

  async processAnomaly(
    userId: string,
    dto: AnomalyReportDto,
  ): Promise<{ welfareInitiated: boolean; sessionId?: string; threshold: number }> {
    const user = first(
      await this.db.select({ safeModeUntil: users.safeModeUntil }).from(users).where(eq(users.id, userId)).limit(1),
    );
    if (user?.safeModeUntil && user.safeModeUntil.getTime() > Date.now()) {
      return { welfareInitiated: false, threshold: DEFAULT_THRESHOLD };
    }

    let threshold = DEFAULT_THRESHOLD;
    if (await this.inRiskZone(dto.gps.lat, dto.gps.lng)) threshold *= RISK_ZONE_FACTOR;

    if (dto.compositeScore < threshold) return { welfareInitiated: false, threshold };

    const { sessionId } = await this.welfare.initiate(
      userId,
      dto.gps,
      dto.incidentTypeHint ?? IncidentType.UNKNOWN,
    );
    return { welfareInitiated: true, sessionId, threshold };
  }

  private async inRiskZone(lat: number, lng: number): Promise<boolean> {
    const res = await this.db.execute(sql`
      SELECT 1 FROM risk_zones
      WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, radius_meters)
      LIMIT 1
    `);
    return res.rows.length > 0;
  }
}
