import { EventBus } from './event-bus.service';
import { EventType, SituationRoomCreatedEvent } from './events';
import { IncidentType, ReporterRole } from '../database/enums';

describe('EventBus (failure isolation, PRD 8.2)', () => {
  const event: SituationRoomCreatedEvent = {
    type: EventType.SITUATION_ROOM_CREATED,
    incidentId: 'STIGNIT-2026-07-01-ABC123',
    incidentType: IncidentType.RTA,
    triggeringUserId: 'u1',
    gps: { lat: 6.6, lng: 3.3 },
    occurredAt: new Date().toISOString(),
    observerMode: false,
    reporterRole: ReporterRole.INVOLVED,
  };

  it('runs all subscribers even when one throws, and enqueues the failure', async () => {
    const retryQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const bus = new EventBus(undefined, retryQueue as any);

    const notification = jest.fn().mockResolvedValue(undefined);
    const institutional = jest.fn().mockRejectedValue(new Error('SMS provider down'));
    const dispatch = jest.fn().mockResolvedValue(undefined);

    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'notification', notification);
    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'institutional', institutional);
    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'dispatch', dispatch);

    await bus.publish(event);

    // Failure in institutional did NOT stop notification or dispatch.
    expect(notification).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    // The failed subscriber was queued for retry (by stable name).
    expect(retryQueue.add).toHaveBeenCalledTimes(1);
    expect(retryQueue.add).toHaveBeenCalledWith(
      'retry',
      expect.objectContaining({ handlerName: 'institutional' }),
      expect.any(Object),
    );
  });

  it('invokeHandler re-runs a single named subscriber', async () => {
    const bus = new EventBus();
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'dispatch', handler);
    await bus.invokeHandler('dispatch', event);
    expect(handler).toHaveBeenCalledWith(event);
  });
});
