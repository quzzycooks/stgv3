import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';

/**
 * Geographic risk clustering (PRD 6.9.4). Weekly: DBSCAN-cluster recent
 * incidents; each cluster of ≥3 becomes/updates a risk zone. Aggregate-only —
 * no user identities.
 */
@Injectable()
export class RiskZoneService {
  private readonly logger = new Logger(RiskZoneService.name);
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async recompute(): Promise<{ zones: number }> {
    await this.db.execute(sql`DELETE FROM risk_zones`);
    const res = await this.db.execute<{ lat: string; lng: string; cnt: string }>(sql`
      SELECT ST_Y(center::geometry) AS lat, ST_X(center::geometry) AS lng, cnt
      FROM (
        SELECT ST_Centroid(ST_Collect(g)) AS center, COUNT(*) AS cnt
        FROM (
          SELECT geom::geometry AS g,
                 ST_ClusterDBSCAN(geom::geometry, eps := 0.002, minpoints := 3) OVER () AS cid
          FROM incidents
          WHERE created_at > now() - interval '90 days'
            AND status <> 'FALSE_ALARM'
        ) s
        WHERE cid IS NOT NULL
        GROUP BY cid
      ) clusters
    `);

    for (const r of res.rows) {
      await this.db.execute(sql`
        INSERT INTO risk_zones (center_lat, center_lng, geom, radius_meters, incident_count, label)
        VALUES (${r.lat}, ${r.lng}, ST_SetSRID(ST_MakePoint(${r.lng}, ${r.lat}),4326)::geography, 200, ${parseInt(r.cnt, 10)}, ${`High-risk zone (${r.cnt} incidents/90d)`})
      `);
    }
    this.logger.log(`Recomputed ${res.rows.length} risk zones`);
    return { zones: res.rows.length };
  }
}
