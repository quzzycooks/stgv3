import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';

export interface NearbyUser {
  userId: string;
  distanceMeters: number;
}

/**
 * Proximity search via PostGIS ST_DWithin (PRD 6.5.3). Default 500m; if fewer
 * than 3 users found, expand to 2km. Real geospatial query against the
 * GiST-indexed user_locations table — never an in-memory scan.
 */
@Injectable()
export class ProximityService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findNearby(
    lat: number,
    lng: number,
    excludeUserId?: string,
    minUsers = 3,
  ): Promise<{ users: NearbyUser[]; radiusMeters: number }> {
    for (const radius of [500, 2000]) {
      const rows = await this.query(lat, lng, radius, excludeUserId);
      if (rows.length >= minUsers || radius === 2000) return { users: rows, radiusMeters: radius };
    }
    return { users: [], radiusMeters: 2000 };
  }

  private async query(
    lat: number,
    lng: number,
    radius: number,
    excludeUserId?: string,
  ): Promise<NearbyUser[]> {
    const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
    const res = await this.db.execute<{ user_id: string; dist: string }>(sql`
      SELECT user_id, ST_Distance(geom, ${point}) AS dist
      FROM user_locations
      WHERE ST_DWithin(geom, ${point}, ${radius})
        ${excludeUserId ? sql`AND user_id <> ${excludeUserId}` : sql``}
      ORDER BY dist ASC
      LIMIT 200
    `);
    return res.rows.map((r) => ({ userId: r.user_id, distanceMeters: parseFloat(r.dist) }));
  }

  /** Upsert a user's location. */
  async upsertLocation(userId: string, lat: number, lng: number, accuracy?: number): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO user_locations (user_id, gps_lat, gps_lng, geom, accuracy_meters, updated_at)
      VALUES (${userId}, ${lat}, ${lng}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, ${accuracy ?? null}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        gps_lat = EXCLUDED.gps_lat, gps_lng = EXCLUDED.gps_lng,
        geom = EXCLUDED.geom, accuracy_meters = EXCLUDED.accuracy_meters, updated_at = now()
    `);
  }
}
