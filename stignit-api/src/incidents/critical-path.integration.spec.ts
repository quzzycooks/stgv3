import { AccessLevel, IncidentType, TriggerType } from '../database/enums';
import { EventBus } from '../messaging/event-bus.service';
import { EventType } from '../messaging/events';
import { FakeDb } from '../test-utils/fake-db';
import { FakeRedis } from '../test-utils/fake-redis';
import { SituationRoomService } from './situation-room.service';
import { WelfareCheckService } from '../welfare/welfare-check.service';

/**
 * Critical-path integration test (PRD 8.2) — service-layer wiring with the REAL
 * EventBus: welfare NEED_HELP → Situation Room creation → parallel fan-out →
 * deliberate failure injection (one subscriber down) → graceful degradation.
 * DB/Redis are faked so the CHAIN LOGIC is verified without infra.
 */
describe('Critical path: welfare → situation room → fan-out (failure isolation)', () => {
  const incidentObj = {
    incidentId: 'STIGNIT-2026-07-01-ABC123',
    incidentType: IncidentType.RTA,
    status: 'ACTIVE',
    gpsLat: '6.6',
    gpsLng: '3.3',
    createdAt: new Date(),
  };

  function buildRoomService(bus: EventBus) {
    // insertWithUniqueId: execute (INSERT) then select the incident row.
    const db = new FakeDb().onExecute([{}]).onSelect([incidentObj]);
    const actionLog = { log: jest.fn().mockResolvedValue(undefined) };
    const proximity = { findNearby: jest.fn().mockResolvedValue({ users: [], radiusMeters: 500 }) };
    const notifications = { enqueue: jest.fn(), enqueueMany: jest.fn() };
    const timers = { add: jest.fn(), remove: jest.fn() };
    const svc = new SituationRoomService(
      db as any,
      actionLog as any,
      proximity as any,
      bus,
      notifications as any,
      timers as any,
    );
    return { svc };
  }

  it('creates the room and fans out; a failing subscriber does not break the others', async () => {
    const retryQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const bus = new EventBus(undefined, retryQueue as any);

    const notification = jest.fn().mockResolvedValue(undefined);
    const institutional = jest.fn().mockRejectedValue(new Error('SMS gateway down')); // INJECTED FAILURE
    const dispatch = jest.fn().mockResolvedValue(undefined);
    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'notification', notification);
    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'institutional', institutional);
    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'dispatch', dispatch);

    const { svc } = buildRoomService(bus);
    const incident = await svc.create({
      triggerType: TriggerType.WELFARE_ESCALATION,
      incidentType: IncidentType.RTA,
      triggeringUserId: 'victim-1',
      gps: { lat: 6.6, lng: 3.3 },
      occurredAt: new Date(),
      observerMode: true,
    });

    expect(incident.incidentId).toBe(incidentObj.incidentId);
    expect(notification).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(institutional).toHaveBeenCalledTimes(1);
    expect(retryQueue.add).toHaveBeenCalledWith(
      'retry',
      expect.objectContaining({ handlerName: 'institutional' }),
      expect.any(Object),
    );
  });

  it('welfare NEED_HELP escalates immediately; SAFE does not create a room', async () => {
    const redis = new FakeRedis();
    const db = new FakeDb().onSelect([{ welfareCheckDelaySec: 120 }], [{ welfareCheckDelaySec: 120 }]);
    const rooms = { create: jest.fn().mockResolvedValue({ incidentId: 'STIGNIT-X' }) };
    const welfare = new WelfareCheckService(
      redis as any,
      db as any,
      rooms as any,
      { enqueue: jest.fn() } as any,
      { log: jest.fn() } as any,
      { add: jest.fn() } as any,
    );

    const safe = await welfare.initiate('victim-1', { lat: 6.6, lng: 3.3 }, IncidentType.RTA);
    await welfare.respond(safe.sessionId, 'victim-1', 'SAFE');
    expect(rooms.create).not.toHaveBeenCalled();

    const help = await welfare.initiate('victim-1', { lat: 6.6, lng: 3.3 }, IncidentType.RTA);
    const res = await welfare.respond(help.sessionId, 'victim-1', 'NEED_HELP');
    expect(rooms.create).toHaveBeenCalledTimes(1);
    expect(res.incidentId).toBe('STIGNIT-X');
  });

  it('rejects a welfare response from a different user', async () => {
    const redis = new FakeRedis();
    const db = new FakeDb().onSelect([{ welfareCheckDelaySec: 120 }]);
    const welfare = new WelfareCheckService(
      redis as any,
      db as any,
      { create: jest.fn() } as any,
      { enqueue: jest.fn() } as any,
      { log: jest.fn() } as any,
      { add: jest.fn() } as any,
    );
    const s = await welfare.initiate('victim-1', { lat: 1, lng: 1 }, IncidentType.RTA);
    await expect(welfare.respond(s.sessionId, 'attacker', 'NEED_HELP')).rejects.toThrow(/not your/i);
  });

  it('sanity: AccessLevel enum present', () => expect(AccessLevel.OBSERVER).toBe('OBSERVER'));
});
