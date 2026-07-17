import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { HospitalCandidate, rankHospitals } from './hospital-scoring';

export interface HospitalRecommendation {
  hospitalId: string;
  name: string;
  contactPhone: string | null;
  distanceMeters: number;
  score: number;
  reason: string;
}

/** Hospital recommendation engine (PRD 6.7.4). Excludes opted-out hospitals. */
@Injectable()
export class HospitalRecommendationService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async recommend(
    lat: number,
    lng: number,
    opts: { needsCardiac?: boolean } = {},
  ): Promise<HospitalRecommendation | null> {
    const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography`;
    const res = await this.db.execute<{
      id: string;
      name: string;
      contact_phone: string | null;
      trauma_level: number;
      has_cath_lab: boolean;
      availability: number | null;
      dist: string;
    }>(sql`
      SELECT id, name, contact_phone, trauma_level, has_cath_lab, availability,
             ST_Distance(geom, ${point}) AS dist
      FROM hospitals
      WHERE opted_out = false AND ST_DWithin(geom, ${point}, 30000)
      ORDER BY dist ASC LIMIT 25
    `);
    if (res.rows.length === 0) return null;

    const candidates: HospitalCandidate[] = res.rows.map((r) => ({
      hospitalId: r.id,
      traumaLevel: r.trauma_level,
      distanceMeters: parseFloat(r.dist),
      availability: r.availability,
      hasCathLab: r.has_cath_lab,
    }));
    const [best] = rankHospitals(candidates, opts);
    const row = res.rows.find((r) => r.id === best.hospitalId)!;
    return {
      hospitalId: best.hospitalId,
      name: row.name,
      contactPhone: row.contact_phone,
      distanceMeters: best.distanceMeters,
      score: best.score,
      reason: `trauma L${best.traumaLevel}, ${Math.round(best.distanceMeters)}m${opts.needsCardiac ? ', cardiac-capable preferred' : ''}`,
    };
  }
}
