import { IncidentType } from '../database/enums';
import { buildInstitutionalPacket } from './institutional-packet';

describe('institutional packet (PRD 6.8.2 — no user identities)', () => {
  const packet = buildInstitutionalPacket({
    incidentId: 'STIGNIT-2026-07-01-ABC123',
    incidentType: IncidentType.RTA,
    gpsLat: 6.6018,
    gpsLng: 3.3515,
    gpsAccuracyMeters: 8,
    occurredAt: new Date('2026-07-01T13:22:04Z'),
    confirmedUsersInRoom: 3,
    nonRespondingUsersFlagged: 1,
    actionsTaken: ['transport dispatched'],
  });

  it('contains location, type and counts', () => {
    expect(packet.incidentType).toBe(IncidentType.RTA);
    expect(packet.location).toEqual({ lat: 6.6018, lng: 3.3515, accuracyMeters: 8 });
    expect(packet.confirmedUsersInRoom).toBe(3);
    expect(packet.nonRespondingUsersFlagged).toBe(1);
  });

  it('leaks NO identity fields', () => {
    const json = JSON.stringify(packet).toLowerCase();
    for (const forbidden of ['userid', 'user_id', 'triggering', 'name', 'phone', 'participant']) {
      expect(json).not.toContain(forbidden);
    }
    // Whitelist the exact top-level keys — additions must be deliberate.
    expect(Object.keys(packet).sort()).toEqual(
      [
        'actionsTaken',
        'confirmedUsersInRoom',
        'incidentId',
        'incidentType',
        'location',
        'nonRespondingUsersFlagged',
        'platformContact',
        'timestamp',
      ].sort(),
    );
  });
});
