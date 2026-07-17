/**
 * Canonical enums shared across the schema. Mirror PRD §9 data models.
 * Kept in one place so migrations, entities, DTOs, and guards agree.
 */

export enum AccessLevel {
  OBSERVER = 'OBSERVER',
  TIER1 = 'TIER1',
  TIER2 = 'TIER2',
  SKILLED = 'SKILLED',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INCOMPLETE = 'INCOMPLETE',
  DELETED = 'DELETED',
}

/** PRD 6.1.1 lists MEDICAL/FIREFIGHTER/LOGISTICS "etc."; UI adds nurse/first-aid/traffic. */
export enum ProfessionalSkill {
  MEDICAL_DOCTOR = 'MEDICAL_DOCTOR',
  NURSE_PARAMEDIC = 'NURSE_PARAMEDIC',
  FIRST_AID = 'FIRST_AID',
  FIREFIGHTER = 'FIREFIGHTER',
  LOGISTICS = 'LOGISTICS',
  TRAFFIC_CONTROL = 'TRAFFIC_CONTROL',
}

export enum SkillVerificationStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TriggerType {
  MANUAL = 'MANUAL',
  WELFARE_ESCALATION = 'WELFARE_ESCALATION',
  WEARABLE = 'WEARABLE',
}

/**
 * PRD §9 Incident.incident_type is the source of truth.
 * NOTE (flagged): the design prototype and drill categories (6.2.5) include
 * FLOOD / CHILD / NIGHT which are NOT in the §9 enum. Following §9; FLOOD folded
 * into drill scenario taxonomy separately, not the incident type. See OQ07.
 */
export enum IncidentType {
  RTA = 'RTA',
  MEDICAL_COLLAPSE = 'MEDICAL_COLLAPSE',
  FIRE = 'FIRE',
  DROWNING = 'DROWNING',
  BUILDING_COLLAPSE = 'BUILDING_COLLAPSE',
  CROWD_CRUSH = 'CROWD_CRUSH',
  UNKNOWN = 'UNKNOWN',
}

export enum IncidentStatus {
  ACTIVE = 'ACTIVE',
  UNDER_CONTROL = 'UNDER_CONTROL',
  TRANSFERRED = 'TRANSFERRED',
  CLOSED = 'CLOSED',
  FALSE_ALARM = 'FALSE_ALARM',
}

export enum BreakoutRole {
  COORDINATOR = 'COORDINATOR',
  MEDICAL_LEAD = 'MEDICAL_LEAD',
  TRANSPORT = 'TRANSPORT',
  SAFETY_MONITOR = 'SAFETY_MONITOR',
  INFO_OFFICER = 'INFO_OFFICER',
  OBSERVER = 'OBSERVER',
}

/** Drill scenario categories (PRD 6.2.5). */
export enum DrillCategory {
  RTA = 'RTA',
  MEDICAL_COLLAPSE = 'MEDICAL_COLLAPSE',
  FIRE = 'FIRE',
  DROWNING = 'DROWNING',
  CROWD_CRUSH = 'CROWD_CRUSH',
  UNKNOWN_VICTIM = 'UNKNOWN_VICTIM',
  CHILD = 'CHILD',
  NIGHT = 'NIGHT',
}

export enum DrillDifficulty {
  BASIC = 'BASIC',
  MEDIUM = 'MEDIUM',
  ADVANCED = 'ADVANCED',
}

export enum DrillOptionKind {
  CORRECT = 'CORRECT',
  PLAUSIBLE = 'PLAUSIBLE',
  DANGEROUS = 'DANGEROUS',
  PASSIVE = 'PASSIVE',
}

export enum InstitutionType {
  POLICE = 'POLICE',
  LASEMA = 'LASEMA',
  SEMA = 'SEMA',
  FIRE_SERVICE = 'FIRE_SERVICE',
}

export enum DispatchChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum DeliveryStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  FLAGGED = 'FLAGGED', // exhausted retries → manual admin follow-up
}

export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  DISPATCHED = 'DISPATCHED',
}

export enum DispatchStatus {
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TIMEOUT = 'TIMEOUT',
  NO_SHOW = 'NO_SHOW',
  ARRIVED = 'ARRIVED',
  DROPOFF = 'DROPOFF',
  CANCELLED = 'CANCELLED',
}

/** NDPA §11.4 — explicit per-category consent captured at onboarding. */
export enum ConsentCategory {
  LOCATION_FOREGROUND = 'LOCATION_FOREGROUND',
  LOCATION_BACKGROUND = 'LOCATION_BACKGROUND',
  MEDICAL_PROCESSING = 'MEDICAL_PROCESSING',
  EMERGENCY_CONTACT_NOTIFY = 'EMERGENCY_CONTACT_NOTIFY',
  DATA_MODEL_TRAINING = 'DATA_MODEL_TRAINING',
  MICROPHONE_DETECTION = 'MICROPHONE_DETECTION',
}

/** Knowledge Library article topics. */
export enum ArticleCategory {
  CPR = 'CPR',
  BLEEDING = 'BLEEDING',
  BURNS = 'BURNS',
  ROAD_CRASH = 'ROAD_CRASH',
  FIRE = 'FIRE',
  CHILD = 'CHILD',
}

export enum ActionType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  MESSAGE = 'MESSAGE',
  AI_QUERY = 'AI_QUERY',
  TRANSPORT_DISPATCHED = 'TRANSPORT_DISPATCHED',
  HOSPITAL_RECOMMENDED = 'HOSPITAL_RECOMMENDED',
  INSTITUTIONAL_NOTIFIED = 'INSTITUTIONAL_NOTIFIED',
  WELFARE_PROMPT = 'WELFARE_PROMPT',
  WELFARE_RESPONSE = 'WELFARE_RESPONSE',
  PROXIMITY_ALERT = 'PROXIMITY_ALERT',
  PROXIMITY_CONFIRMED = 'PROXIMITY_CONFIRMED',
  ESCALATION_STARTED = 'ESCALATION_STARTED',
  CONTACT_NOTIFIED = 'CONTACT_NOTIFIED',
  MODERATOR_ACTION = 'MODERATOR_ACTION',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_MERGED = 'INCIDENT_MERGED',
}
