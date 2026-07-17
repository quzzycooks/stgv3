import { IncidentType } from '../database/enums';

/**
 * The institutional incident packet (PRD 6.8.2). This is a DEDICATED outbound
 * shape — the internal Incident object is NEVER serialized to institutions.
 * It deliberately contains NO individual user identities (6.8.2 note): police
 * receive location + incident type + counts only.
 */
export interface InstitutionalPacket {
  incidentId: string;
  timestamp: string;
  incidentType: IncidentType;
  location: { lat: number; lng: number; accuracyMeters: number | null };
  confirmedUsersInRoom: number;
  nonRespondingUsersFlagged: number;
  actionsTaken: string[];
  platformContact: string;
}

export interface PacketInputs {
  incidentId: string;
  incidentType: IncidentType;
  gpsLat: number;
  gpsLng: number;
  gpsAccuracyMeters: number | null;
  occurredAt: Date;
  confirmedUsersInRoom: number;
  nonRespondingUsersFlagged: number;
  actionsTaken: string[];
}

const PLATFORM_CONTACT = 'Stignit Ops +234-XXX-XXXX';

export function buildInstitutionalPacket(input: PacketInputs): InstitutionalPacket {
  // Explicit field-by-field construction — nothing from the internal entity
  // leaks by accident (no triggering_user_id, no participant ids, no names).
  return {
    incidentId: input.incidentId,
    timestamp: input.occurredAt.toISOString(),
    incidentType: input.incidentType,
    location: {
      lat: input.gpsLat,
      lng: input.gpsLng,
      accuracyMeters: input.gpsAccuracyMeters,
    },
    confirmedUsersInRoom: input.confirmedUsersInRoom,
    nonRespondingUsersFlagged: input.nonRespondingUsersFlagged,
    actionsTaken: input.actionsTaken,
    platformContact: PLATFORM_CONTACT,
  };
}

export function renderPacketSms(p: InstitutionalPacket): string {
  return `STIGNIT INCIDENT ${p.incidentId}: ${p.incidentType} at ${p.location.lat.toFixed(5)},${p.location.lng.toFixed(5)} (±${p.location.accuracyMeters ?? '?'}m). ${p.confirmedUsersInRoom} present, ${p.nonRespondingUsersFlagged} unresponsive. Contact ${p.platformContact}`;
}
