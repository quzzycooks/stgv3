/**
 * Mirrors src/database/enums.ts in stignit-api verbatim. Keep in sync with
 * the backend — the API rejects any value outside these sets.
 */

export const AccessLevel = ["OBSERVER", "TIER1", "TIER2", "SKILLED"] as const;
export type AccessLevel = (typeof AccessLevel)[number];

export const AccountStatus = ["ACTIVE", "SUSPENDED", "INCOMPLETE", "DELETED"] as const;
export type AccountStatus = (typeof AccountStatus)[number];

export const ProfessionalSkill = [
  "MEDICAL_DOCTOR",
  "NURSE_PARAMEDIC",
  "FIRST_AID",
  "FIREFIGHTER",
  "LOGISTICS",
  "TRAFFIC_CONTROL",
] as const;
export type ProfessionalSkill = (typeof ProfessionalSkill)[number];

export const SkillVerificationStatus = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;
export type SkillVerificationStatus = (typeof SkillVerificationStatus)[number];

export const TriggerType = ["MANUAL", "WELFARE_ESCALATION", "WEARABLE"] as const;
export type TriggerType = (typeof TriggerType)[number];

export const IncidentType = [
  "RTA",
  "MEDICAL_COLLAPSE",
  "FIRE",
  "DROWNING",
  "BUILDING_COLLAPSE",
  "CROWD_CRUSH",
  "UNKNOWN",
] as const;
export type IncidentType = (typeof IncidentType)[number];

export const IncidentStatus = ["ACTIVE", "UNDER_CONTROL", "TRANSFERRED", "CLOSED", "FALSE_ALARM"] as const;
export type IncidentStatus = (typeof IncidentStatus)[number];

export const BreakoutRole = [
  "COORDINATOR",
  "MEDICAL_LEAD",
  "TRANSPORT",
  "SAFETY_MONITOR",
  "INFO_OFFICER",
  "OBSERVER",
] as const;
export type BreakoutRole = (typeof BreakoutRole)[number];

export const ActionType = [
  "STATUS_CHANGE",
  "ROLE_ASSIGNED",
  "MESSAGE",
  "AI_QUERY",
  "TRANSPORT_DISPATCHED",
  "HOSPITAL_RECOMMENDED",
  "INSTITUTIONAL_NOTIFIED",
  "WELFARE_PROMPT",
  "WELFARE_RESPONSE",
  "PROXIMITY_ALERT",
  "PROXIMITY_CONFIRMED",
  "ESCALATION_STARTED",
  "CONTACT_NOTIFIED",
  "MODERATOR_ACTION",
  "INCIDENT_CREATED",
  "INCIDENT_MERGED",
] as const;
export type ActionType = (typeof ActionType)[number];

export const ConsentCategory = [
  "LOCATION_FOREGROUND",
  "LOCATION_BACKGROUND",
  "MEDICAL_PROCESSING",
  "EMERGENCY_CONTACT_NOTIFY",
  "DATA_MODEL_TRAINING",
  "MICROPHONE_DETECTION",
] as const;
export type ConsentCategory = (typeof ConsentCategory)[number];

export const DriverStatus = ["OFFLINE", "AVAILABLE", "DISPATCHED"] as const;
export type DriverStatus = (typeof DriverStatus)[number];

export const DispatchStatus = [
  "OFFERED",
  "ACCEPTED",
  "DECLINED",
  "TIMEOUT",
  "NO_SHOW",
  "ARRIVED",
  "DROPOFF",
  "CANCELLED",
] as const;
export type DispatchStatus = (typeof DispatchStatus)[number];

export const DrillCategory = [
  "RTA",
  "MEDICAL_COLLAPSE",
  "FIRE",
  "DROWNING",
  "CROWD_CRUSH",
  "UNKNOWN_VICTIM",
  "CHILD",
  "NIGHT",
] as const;
export type DrillCategory = (typeof DrillCategory)[number];

export const DrillDifficulty = ["BASIC", "MEDIUM", "ADVANCED"] as const;
export type DrillDifficulty = (typeof DrillDifficulty)[number];

export const DrillOptionKind = ["CORRECT", "PLAUSIBLE", "DANGEROUS", "PASSIVE"] as const;
export type DrillOptionKind = (typeof DrillOptionKind)[number];

export const ModerationAction = ["MUTE", "UNMUTE", "REMOVE", "FLAG"] as const;
export type ModerationAction = (typeof ModerationAction)[number];

export const WelfareResponse = ["SAFE", "NEED_HELP"] as const;
export type WelfareResponse = (typeof WelfareResponse)[number];

export const ArticleCategory = ["CPR", "BLEEDING", "BURNS", "ROAD_CRASH", "FIRE", "CHILD"] as const;
export type ArticleCategory = (typeof ArticleCategory)[number];

export const AuthorBadge = ["DOCTOR", "PARAMEDIC", "COMMUNITY"] as const;
export type AuthorBadge = (typeof AuthorBadge)[number];

export const ARTICLE_CATEGORY_LABEL: Record<ArticleCategory, string> = {
  CPR: "CPR",
  BLEEDING: "Bleeding",
  BURNS: "Burns",
  ROAD_CRASH: "Road Crash",
  FIRE: "Fire",
  CHILD: "Child",
};

export const AUTHOR_BADGE_LABEL: Record<AuthorBadge, string> = {
  DOCTOR: "Doctor",
  PARAMEDIC: "Paramedic",
  COMMUNITY: "Community member",
};

/** Human-readable labels for enum values, used across the UI. */
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  RTA: "Road Traffic Accident",
  MEDICAL_COLLAPSE: "Medical Emergency",
  FIRE: "Fire",
  DROWNING: "Drowning",
  BUILDING_COLLAPSE: "Building Collapse",
  CROWD_CRUSH: "Crowd Crush",
  UNKNOWN: "Other Emergency",
};

export const ACCESS_LEVEL_LABEL: Record<AccessLevel, string> = {
  OBSERVER: "Observer",
  TIER1: "Tier 1 Responder",
  TIER2: "Tier 2 Responder",
  SKILLED: "Skilled Professional",
};

export const BREAKOUT_ROLE_LABEL: Record<BreakoutRole, string> = {
  COORDINATOR: "Coordinator",
  MEDICAL_LEAD: "Medical Lead",
  TRANSPORT: "Transport",
  SAFETY_MONITOR: "Safety Monitor",
  INFO_OFFICER: "Info Officer",
  OBSERVER: "Observer",
};

export const PROFESSIONAL_SKILL_LABEL: Record<ProfessionalSkill, string> = {
  MEDICAL_DOCTOR: "Medical Doctor",
  NURSE_PARAMEDIC: "Nurse / Paramedic",
  FIRST_AID: "First Aid Certified",
  FIREFIGHTER: "Firefighter",
  LOGISTICS: "Logistics",
  TRAFFIC_CONTROL: "Traffic Control",
};

export const CONSENT_CATEGORY_LABEL: Record<ConsentCategory, { title: string; description: string }> = {
  LOCATION_FOREGROUND: {
    title: "Location while using Stignit",
    description: "Used to pinpoint you accurately when you trigger an emergency.",
  },
  LOCATION_BACKGROUND: {
    title: "Background location",
    description: "Lets Stignit detect and locate anomalies even when the app is closed.",
  },
  MEDICAL_PROCESSING: {
    title: "Medical information processing",
    description: "Allows verified responders to view your medical profile during an open incident.",
  },
  EMERGENCY_CONTACT_NOTIFY: {
    title: "Notify emergency contacts",
    description: "Lets Stignit alert your emergency contacts by SMS when a Situation Room opens.",
  },
  DATA_MODEL_TRAINING: {
    title: "Anonymized model training",
    description: "Lets anonymized incident data help improve detection accuracy.",
  },
  MICROPHONE_DETECTION: {
    title: "Microphone-based detection",
    description: "Allows ambient audio analysis to help detect a crash or collapse.",
  },
};
