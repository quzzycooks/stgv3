import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ActionType, DispatchStatus, DriverStatus, IncidentStatus, IncidentType } from '../database/enums';
import { driverDispatches, drivers, incidents, type Driver, type DriverDispatch, type Incident } from '../database/schema';
import { first } from '../database/util';
import { ActionLogService } from '../incidents/action-log.service';
import { SituationRoomService } from '../incidents/situation-room.service';
import { SituationRoomGateway } from '../incidents/situation-room.gateway';
import { DISPATCH_QUEUE } from '../messaging/queue.tokens';
import { NotificationService } from '../notification/notification.service';
import { HospitalRecommendationService } from './hospital-recommendation.service';

const OFFER_WINDOW_MS = 90_000;
const NO_SHOW_MS = 5 * 60_000;
const RADIUS_STEPS_KM = [1, 3, 5];

/**
 * Transport coordination (PRD 6.7). Job/timer-driven state machine. Only fully
 * verified, AVAILABLE drivers are offered; radius expands 1→5km; each offer has
 * a 90s window with automatic fall-through.
 */
@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly hospitals: HospitalRecommendationService,
    private readonly notifications: NotificationService,
    private readonly actionLog: ActionLogService,
    private readonly rooms: SituationRoomService,
    private readonly gateway: SituationRoomGateway,
    @InjectQueue(DISPATCH_QUEUE) private readonly queue: Queue,
  ) {}

  private incidentById(incidentId: string): Promise<Incident | null> {
    return this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1).then(first);
  }

  async requestDispatch(incidentId: string): Promise<{ offeredDriverId: string | null }> {
    const incident = await this.incidentById(incidentId);
    if (!incident) throw new NotFoundException('Incident not found');
    return this.offerNext(incident, RADIUS_STEPS_KM[0]);
  }

  async continueDispatch(incidentId: string, radiusKm: number): Promise<void> {
    const incident = await this.incidentById(incidentId);
    if (incident && incident.status === IncidentStatus.ACTIVE) await this.offerNext(incident, radiusKm);
  }

  private async offerNext(incident: Incident, radiusKm: number): Promise<{ offeredDriverId: string | null }> {
    const driver = await this.findNearestEligible(incident, radiusKm);
    if (!driver) {
      const nextRadius = RADIUS_STEPS_KM[RADIUS_STEPS_KM.indexOf(radiusKm) + 1];
      if (nextRadius) {
        await this.queue.add(
          'expand-radius',
          { incidentId: incident.incidentId, radiusKm: nextRadius },
          { delay: 120_000 },
        );
      } else {
        this.logger.warn(`No drivers found for ${incident.incidentId} within max radius`);
        await this.actionLog.log(incident.incidentId, ActionType.TRANSPORT_DISPATCHED, { result: 'no_driver_available' });
      }
      return { offeredDriverId: null };
    }

    const [dispatch] = await this.db
      .insert(driverDispatches)
      .values({ incidentId: incident.incidentId, driverId: driver.id, status: DispatchStatus.OFFERED, radiusKm })
      .returning();
    await this.notifications.enqueue({
      channel: 'push',
      target: `driver:${driver.id}`,
      title: 'Emergency transport request',
      body: `Incident ${incident.incidentType} nearby. Accept within 90s.`,
    });
    await this.queue.add('offer-timeout', { dispatchId: dispatch.id }, { delay: OFFER_WINDOW_MS, jobId: `offer:${dispatch.id}` });
    await this.actionLog.log(incident.incidentId, ActionType.TRANSPORT_DISPATCHED, {
      driverId: driver.id,
      radiusKm,
      stage: 'offered',
    });
    return { offeredDriverId: driver.id };
  }

  private async findNearestEligible(incident: Incident, radiusKm: number): Promise<Driver | null> {
    const point = sql`ST_SetSRID(ST_MakePoint(${incident.gpsLng}, ${incident.gpsLat}),4326)::geography`;
    const res = await this.db.execute<{ id: string }>(sql`
      SELECT d.id FROM drivers d
      WHERE d.status = 'AVAILABLE'
        AND d.license_verified AND d.vehicle_inspected AND d.background_checked AND d.training_completed
        AND d.geom IS NOT NULL
        AND ST_DWithin(d.geom, ${point}, ${radiusKm * 1000})
        AND d.id NOT IN (SELECT driver_id FROM driver_dispatches WHERE incident_id = ${incident.incidentId})
      ORDER BY ST_Distance(d.geom, ${point}) ASC LIMIT 1
    `);
    if (res.rows.length === 0) return null;
    return this.db.select().from(drivers).where(eq(drivers.id, res.rows[0].id)).limit(1).then(first);
  }

  async respond(dispatchId: string, driverId: string, accept: boolean): Promise<{ status: DispatchStatus }> {
    const dispatch = first(
      await this.db.select().from(driverDispatches).where(eq(driverDispatches.id, dispatchId)).limit(1),
    );
    if (!dispatch || dispatch.driverId !== driverId) throw new NotFoundException('Dispatch not found');
    if (dispatch.status !== DispatchStatus.OFFERED) throw new BadRequestException('Offer is no longer open');

    if (!accept) {
      await this.db.update(driverDispatches).set({ status: DispatchStatus.DECLINED, respondedAt: new Date() }).where(eq(driverDispatches.id, dispatchId));
      await this.queue.remove(`offer:${dispatchId}`).catch(() => undefined);
      const incident = await this.incidentById(dispatch.incidentId);
      if (incident) await this.offerNext(incident, dispatch.radiusKm);
      return { status: DispatchStatus.DECLINED };
    }

    const incident = await this.incidentById(dispatch.incidentId);
    await this.db.update(drivers).set({ status: DriverStatus.DISPATCHED }).where(eq(drivers.id, driverId));

    let hospitalId: string | null = null;
    if (incident) {
      const rec = await this.hospitals.recommend(parseFloat(incident.gpsLat), parseFloat(incident.gpsLng), {
        needsCardiac: incident.incidentType === IncidentType.MEDICAL_COLLAPSE,
      });
      if (rec) {
        hospitalId = rec.hospitalId;
        await this.db
          .update(incidents)
          .set({ hospitalId: rec.hospitalId, transportDriverId: driverId })
          .where(eq(incidents.incidentId, incident.incidentId));
        await this.actionLog.log(incident.incidentId, ActionType.HOSPITAL_RECOMMENDED, {
          hospitalId: rec.hospitalId,
          reason: rec.reason,
        });
        if (rec.contactPhone) {
          const driver = first(await this.db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1));
          await this.notifications.enqueue({
            channel: 'sms',
            to: rec.contactPhone,
            body: `Stignit pre-arrival: ${incident.incidentType} inbound. Vehicle ${driver?.plateNumber}. Incident ${incident.incidentId}.`,
          });
        }
      }
    }

    await this.db
      .update(driverDispatches)
      .set({ status: DispatchStatus.ACCEPTED, acceptedAt: new Date(), respondedAt: new Date(), hospitalId })
      .where(eq(driverDispatches.id, dispatchId));
    await this.queue.remove(`offer:${dispatchId}`).catch(() => undefined);
    await this.queue.add('no-show', { dispatchId }, { delay: NO_SHOW_MS, jobId: `noshow:${dispatchId}` });
    await this.actionLog.log(dispatch.incidentId, ActionType.TRANSPORT_DISPATCHED, { driverId, stage: 'accepted' });
    this.gateway.emitToIncident(dispatch.incidentId, 'transport:accepted', { driverId, dispatchId });
    return { status: DispatchStatus.ACCEPTED };
  }

  async onOfferTimeout(dispatchId: string): Promise<void> {
    const dispatch = first(
      await this.db.select().from(driverDispatches).where(eq(driverDispatches.id, dispatchId)).limit(1),
    );
    if (!dispatch || dispatch.status !== DispatchStatus.OFFERED) return;
    await this.db.update(driverDispatches).set({ status: DispatchStatus.TIMEOUT }).where(eq(driverDispatches.id, dispatchId));
    const incident = await this.incidentById(dispatch.incidentId);
    if (incident) await this.offerNext(incident, dispatch.radiusKm);
  }

  async onNoShow(dispatchId: string): Promise<void> {
    const dispatch = first(
      await this.db.select().from(driverDispatches).where(eq(driverDispatches.id, dispatchId)).limit(1),
    );
    if (!dispatch || dispatch.status !== DispatchStatus.ACCEPTED) return;
    await this.db.update(driverDispatches).set({ status: DispatchStatus.NO_SHOW }).where(eq(driverDispatches.id, dispatchId));
    await this.db
      .update(drivers)
      .set({ noShowCount: sql`${drivers.noShowCount} + 1`, status: DriverStatus.AVAILABLE })
      .where(eq(drivers.id, dispatch.driverId));
    await this.actionLog.log(dispatch.incidentId, ActionType.TRANSPORT_DISPATCHED, { driverId: dispatch.driverId, stage: 'no_show' });
    const incident = await this.incidentById(dispatch.incidentId);
    if (incident) await this.offerNext(incident, dispatch.radiusKm);
  }

  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE drivers SET gps_lat=${lat}, gps_lng=${lng},
        geom=ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, updated_at=now()
      WHERE id=${driverId}
    `);
    const active = first(
      await this.db
        .select({ incidentId: driverDispatches.incidentId })
        .from(driverDispatches)
        .where(and(eq(driverDispatches.driverId, driverId), eq(driverDispatches.status, DispatchStatus.ACCEPTED)))
        .limit(1),
    );
    if (active) this.gateway.emitToIncident(active.incidentId, 'transport:location', { driverId, lat, lng });
  }

  async confirmArrival(dispatchId: string, driverId: string): Promise<void> {
    const d = first(
      await this.db
        .select()
        .from(driverDispatches)
        .where(and(eq(driverDispatches.id, dispatchId), eq(driverDispatches.driverId, driverId)))
        .limit(1),
    );
    if (!d) throw new NotFoundException('Dispatch not found');
    await this.db.update(driverDispatches).set({ status: DispatchStatus.ARRIVED, arrivedAt: new Date() }).where(eq(driverDispatches.id, dispatchId));
    await this.queue.remove(`noshow:${dispatchId}`).catch(() => undefined);
    this.gateway.emitToIncident(d.incidentId, 'transport:arrived', { driverId });
  }

  async confirmDropoff(dispatchId: string, driverId: string): Promise<void> {
    const d = first(
      await this.db
        .select()
        .from(driverDispatches)
        .where(and(eq(driverDispatches.id, dispatchId), eq(driverDispatches.driverId, driverId)))
        .limit(1),
    );
    if (!d) throw new NotFoundException('Dispatch not found');
    await this.db.update(driverDispatches).set({ status: DispatchStatus.DROPOFF, dropoffAt: new Date() }).where(eq(driverDispatches.id, dispatchId));
    await this.db.update(drivers).set({ status: DriverStatus.AVAILABLE }).where(eq(drivers.id, driverId));
    await this.rooms.transition(d.incidentId, IncidentStatus.TRANSFERRED, { by: 'transport' });
    this.gateway.emitToIncident(d.incidentId, 'transport:dropoff', { driverId });
  }

  getTransportStatus(incidentId: string): Promise<DriverDispatch[]> {
    return this.db
      .select()
      .from(driverDispatches)
      .where(eq(driverDispatches.incidentId, incidentId))
      .orderBy(sql`offered_at DESC`);
  }
}
