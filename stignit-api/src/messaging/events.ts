import { IncidentStatus, IncidentType } from '../database/enums';

/** Canonical event names on the bus (PRD 8.2). */
export enum EventType {
  SITUATION_ROOM_CREATED = 'SituationRoom:Created',
  SITUATION_ROOM_STATUS_CHANGED = 'SituationRoom:StatusChanged',
  WELFARE_ESCALATION_STARTED = 'Welfare:EscalationStarted',
  DRIVER_ACCEPTED = 'Transport:DriverAccepted',
  DRIVER_DROPOFF = 'Transport:Dropoff',
  INCIDENT_CLOSED = 'Incident:Closed',
}

export interface SituationRoomCreatedEvent {
  type: EventType.SITUATION_ROOM_CREATED;
  incidentId: string;
  incidentType: IncidentType;
  triggeringUserId: string | null;
  gps: { lat: number; lng: number; accuracyMeters?: number };
  occurredAt: string;
  observerMode: boolean; // true when created via escalation (no explicit NEED_HELP)
}

export interface IncidentStatusChangedEvent {
  type: EventType.SITUATION_ROOM_STATUS_CHANGED;
  incidentId: string;
  from: IncidentStatus;
  to: IncidentStatus;
}

export interface IncidentClosedEvent {
  type: EventType.INCIDENT_CLOSED;
  incidentId: string;
  finalStatus: IncidentStatus;
}

export type DomainEvent =
  | SituationRoomCreatedEvent
  | IncidentStatusChangedEvent
  | IncidentClosedEvent
  | { type: EventType; [k: string]: unknown };
