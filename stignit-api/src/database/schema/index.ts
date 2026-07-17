import {
  boolean,
  char,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  AccessLevel,
  AccountStatus,
  ActionType,
  ArticleCategory,
  BreakoutRole,
  ConsentCategory,
  DeliveryStatus,
  DispatchChannel,
  DispatchStatus,
  DriverStatus,
  DrillCategory,
  DrillDifficulty,
  IncidentStatus,
  IncidentType,
  InstitutionType,
  ProfessionalSkill,
  SkillVerificationStatus,
  TriggerType,
} from '../enums';
import { encryptedJson, encryptedText, geographyPoint } from './custom-types';

const vals = (e: Record<string, string>) => Object.values(e) as [string, ...string[]];

// --- Postgres enum types ---
export const accessLevelEnum = pgEnum('access_level_enum', vals(AccessLevel));
export const accountStatusEnum = pgEnum('account_status_enum', vals(AccountStatus));
export const professionalSkillEnum = pgEnum('professional_skill_enum', vals(ProfessionalSkill));
export const skillVerificationStatusEnum = pgEnum('skill_verification_status_enum', vals(SkillVerificationStatus));
export const triggerTypeEnum = pgEnum('trigger_type_enum', vals(TriggerType));
export const incidentTypeEnum = pgEnum('incident_type_enum', vals(IncidentType));
export const incidentStatusEnum = pgEnum('incident_status_enum', vals(IncidentStatus));
export const breakoutRoleEnum = pgEnum('breakout_role_enum', vals(BreakoutRole));
export const actionTypeEnum = pgEnum('action_type_enum', vals(ActionType));
export const consentCategoryEnum = pgEnum('consent_category_enum', vals(ConsentCategory));
export const driverStatusEnum = pgEnum('driver_status_enum', vals(DriverStatus));
export const dispatchStatusEnum = pgEnum('dispatch_status_enum', vals(DispatchStatus));
export const institutionTypeEnum = pgEnum('institution_type_enum', vals(InstitutionType));
export const dispatchChannelEnum = pgEnum('dispatch_channel_enum', vals(DispatchChannel));
export const deliveryStatusEnum = pgEnum('delivery_status_enum', vals(DeliveryStatus));
export const drillCategoryEnum = pgEnum('drill_category_enum', vals(DrillCategory));
export const drillDifficultyEnum = pgEnum('drill_difficulty_enum', vals(DrillDifficulty));
export const articleCategoryEnum = pgEnum('article_category_enum', vals(ArticleCategory));

const ts = (name: string) => timestamp(name, { withTimezone: true });

// --- users ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneHash: char('phone_hash', { length: 64 }).notNull().unique(),
  phoneNumber: encryptedText('phone_number').notNull(),
  fullName: encryptedText('full_name').notNull(),
  dateOfBirth: encryptedText('date_of_birth').notNull(),
  stateLga: varchar('state_lga', { length: 100 }),
  profilePhotoUrl: text('profile_photo_url'),
  medicalInfo: encryptedJson<Record<string, unknown>>()('medical_info'),
  accessLevel: accessLevelEnum('access_level').notNull().default(AccessLevel.OBSERVER),
  drillCompletionPct: doublePrecision('drill_completion_pct').notNull().default(0),
  safeModeUntil: ts('safe_mode_until'),
  welfareCheckDelaySec: integer('welfare_check_delay_sec').notNull().default(120),
  professionalSkill: professionalSkillEnum('professional_skill'),
  skillVerificationStatus: skillVerificationStatusEnum('skill_verification_status')
    .notNull()
    .default(SkillVerificationStatus.NONE),
  skillVerified: boolean('skill_verified').notNull().default(false),
  accountStatus: accountStatusEnum('account_status').notNull().default(AccountStatus.INCOMPLETE),
  deletionRequestedAt: ts('deletion_requested_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  lastActiveAt: ts('last_active_at'),
});

// --- emergency_contacts ---
export const emergencyContacts = pgTable('emergency_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: encryptedText('name').notNull(),
  phoneNumber: encryptedText('phone_number').notNull(),
  phoneHash: char('phone_hash', { length: 64 }).notNull(),
  relationship: varchar('relationship', { length: 100 }).notNull(),
  priority: integer('priority').notNull().default(1),
  verified: boolean('verified').notNull().default(false),
  optedOut: boolean('opted_out').notNull().default(false),
  optedOutAt: ts('opted_out_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- incidents ---
export const incidents = pgTable('incidents', {
  incidentId: varchar('incident_id', { length: 26 }).primaryKey(),
  triggeringUserId: uuid('triggering_user_id'),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  incidentType: incidentTypeEnum('incident_type').notNull(),
  status: incidentStatusEnum('status').notNull().default(IncidentStatus.ACTIVE),
  gpsLat: numeric('gps_lat', { precision: 9, scale: 6 }).notNull(),
  gpsLng: numeric('gps_lng', { precision: 9, scale: 6 }).notNull(),
  gpsAccuracyMeters: doublePrecision('gps_accuracy_meters'),
  geom: geographyPoint('geom'),
  hospitalId: uuid('hospital_id'),
  transportDriverId: uuid('transport_driver_id'),
  falseAlarmReason: varchar('false_alarm_reason', { length: 500 }),
  createdAt: ts('created_at').notNull().defaultNow(),
  occurredAt: ts('occurred_at').notNull(),
  syncedAt: ts('synced_at'),
  closedAt: ts('closed_at'),
  anonymizedAt: ts('anonymized_at'),
});

// --- incident_participants ---
export const incidentParticipants = pgTable('incident_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: varchar('incident_id', { length: 26 }).notNull(),
  userId: uuid('user_id').notNull(),
  proximityConfirmed: boolean('proximity_confirmed'),
  proximityFlaggedSilent: boolean('proximity_flagged_silent').notNull().default(false),
  breakoutRoomRole: breakoutRoleEnum('breakout_room_role'),
  isModerator: boolean('is_moderator').notNull().default(false),
  joinedBreakoutAt: ts('joined_breakout_at'),
  leftBreakoutAt: ts('left_breakout_at'),
  joinedAt: ts('joined_at').notNull().defaultNow(),
});

// --- incident_action_logs ---
export const incidentActionLogs = pgTable('incident_action_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: varchar('incident_id', { length: 26 }).notNull(),
  actorSessionToken: varchar('actor_session_token', { length: 64 }),
  actionType: actionTypeEnum('action_type').notNull(),
  actionPayload: jsonb('action_payload').notNull().default({}),
  timestamp: ts('timestamp').notNull().defaultNow(),
});

// --- skill_verifications ---
export const skillVerifications = pgTable('skill_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  skill: professionalSkillEnum('skill').notNull(),
  documentUrl: text('document_url').notNull(),
  status: skillVerificationStatusEnum('status').notNull().default(SkillVerificationStatus.PENDING),
  reviewerAdminId: uuid('reviewer_admin_id'),
  reviewNotes: varchar('review_notes', { length: 1000 }),
  slaDueAt: ts('sla_due_at').notNull(),
  submittedAt: ts('submitted_at').notNull().defaultNow(),
  reviewedAt: ts('reviewed_at'),
});

// --- consent_records ---
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  category: consentCategoryEnum('category').notNull(),
  granted: boolean('granted').notNull(),
  policyVersion: varchar('policy_version', { length: 20 }).notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- user_locations ---
export const userLocations = pgTable('user_locations', {
  userId: uuid('user_id').primaryKey(),
  gpsLat: numeric('gps_lat', { precision: 9, scale: 6 }).notNull(),
  gpsLng: numeric('gps_lng', { precision: 9, scale: 6 }).notNull(),
  geom: geographyPoint('geom').notNull(),
  accuracyMeters: doublePrecision('accuracy_meters'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// --- risk_zones ---
export const riskZones = pgTable('risk_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  centerLat: numeric('center_lat', { precision: 9, scale: 6 }).notNull(),
  centerLng: numeric('center_lng', { precision: 9, scale: 6 }).notNull(),
  geom: geographyPoint('geom').notNull(),
  radiusMeters: integer('radius_meters').notNull().default(200),
  incidentCount: integer('incident_count').notNull().default(0),
  label: varchar('label', { length: 200 }),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// --- breakout_messages ---
export const breakoutMessages = pgTable('breakout_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: varchar('incident_id', { length: 26 }).notNull(),
  senderUserId: uuid('sender_user_id').notNull(),
  senderRole: breakoutRoleEnum('sender_role'),
  content: text('content').notNull(),
  flagged: boolean('flagged').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- drivers ---
export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: encryptedText('full_name').notNull(),
  phoneNumber: encryptedText('phone_number').notNull(),
  vehicleDescription: varchar('vehicle_description', { length: 200 }).notNull(),
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),
  licenseVerified: boolean('license_verified').notNull().default(false),
  vehicleInspected: boolean('vehicle_inspected').notNull().default(false),
  backgroundChecked: boolean('background_checked').notNull().default(false),
  trainingCompleted: boolean('training_completed').notNull().default(false),
  status: driverStatusEnum('status').notNull().default(DriverStatus.OFFLINE),
  gpsLat: numeric('gps_lat', { precision: 9, scale: 6 }),
  gpsLng: numeric('gps_lng', { precision: 9, scale: 6 }),
  geom: geographyPoint('geom'),
  noShowCount: integer('no_show_count').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// --- hospitals ---
export const hospitals = pgTable('hospitals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 20 }),
  gpsLat: numeric('gps_lat', { precision: 9, scale: 6 }).notNull(),
  gpsLng: numeric('gps_lng', { precision: 9, scale: 6 }).notNull(),
  geom: geographyPoint('geom').notNull(),
  traumaLevel: integer('trauma_level').notNull().default(1),
  hasCathLab: boolean('has_cath_lab').notNull().default(false),
  availability: doublePrecision('availability'),
  optedOut: boolean('opted_out').notNull().default(false),
});

// --- driver_dispatches ---
export const driverDispatches = pgTable('driver_dispatches', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: varchar('incident_id', { length: 26 }).notNull(),
  driverId: uuid('driver_id').notNull(),
  status: dispatchStatusEnum('status').notNull().default(DispatchStatus.OFFERED),
  radiusKm: integer('radius_km').notNull(),
  hospitalId: uuid('hospital_id'),
  offeredAt: ts('offered_at').notNull().defaultNow(),
  respondedAt: ts('responded_at'),
  acceptedAt: ts('accepted_at'),
  arrivedAt: ts('arrived_at'),
  dropoffAt: ts('dropoff_at'),
});

// --- institutional_contacts ---
export const institutionalContacts = pgTable('institutional_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  type: institutionTypeEnum('type').notNull(),
  cityZone: varchar('city_zone', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  active: boolean('active').notNull().default(true),
});

// --- institutional_dispatches ---
export const institutionalDispatches = pgTable('institutional_dispatches', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: varchar('incident_id', { length: 26 }).notNull(),
  contactId: uuid('contact_id').notNull(),
  channel: dispatchChannelEnum('channel').notNull(),
  status: deliveryStatusEnum('status').notNull().default(DeliveryStatus.QUEUED),
  attempts: integer('attempts').notNull().default(0),
  lastError: varchar('last_error', { length: 500 }),
  packet: jsonb('packet').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// --- drill_scenarios ---
export const drillScenarios = pgTable('drill_scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  category: drillCategoryEnum('category').notNull(),
  difficulty: drillDifficultyEnum('difficulty').notNull(),
  prompt: text('prompt').notNull(),
  options: jsonb('options').notNull(),
  points: integer('points').notNull().default(50),
  active: boolean('active').notNull().default(true),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- drill_sessions ---
export const drillSessions = pgTable('drill_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  scenarioId: uuid('scenario_id').notNull(),
  optionOrder: jsonb('option_order').notNull(),
  completed: boolean('completed').notNull().default(false),
  startedAt: ts('started_at').notNull().defaultNow(),
  completedAt: ts('completed_at'),
});

// --- drill_responses ---
export const drillResponses = pgTable('drill_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: uuid('user_id').notNull(),
  scenarioId: uuid('scenario_id').notNull(),
  category: drillCategoryEnum('category').notNull(),
  chosenOptionId: varchar('chosen_option_id', { length: 64 }).notNull(),
  correct: boolean('correct').notNull(),
  timeToDecisionMs: integer('time_to_decision_ms').notNull(),
  hesitationEvents: integer('hesitation_events').notNull().default(0),
  gamingFlagged: boolean('gaming_flagged').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- articles (Knowledge Library) ---
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  summary: varchar('summary', { length: 300 }).notNull(),
  content: text('content').notNull(),
  category: articleCategoryEnum('category').notNull(),
  authorUserId: uuid('author_user_id').notNull(),
  readTimeMinutes: integer('read_time_minutes').notNull().default(3),
  saveCount: integer('save_count').notNull().default(0),
  featured: boolean('featured').notNull().default(false),
  reviewed: boolean('reviewed').notNull().default(false),
  reviewedByAdminId: uuid('reviewed_by_admin_id'),
  reviewedAt: ts('reviewed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// --- article_saves ---
export const articleSaves = pgTable('article_saves', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull(),
  userId: uuid('user_id').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- article_comments ---
export const articleComments = pgTable('article_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull(),
  userId: uuid('user_id').notNull(),
  content: varchar('content', { length: 1000 }).notNull(),
  flagged: boolean('flagged').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- admins ---
export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  name: varchar('name', { length: 200 }),
  role: varchar('role', { length: 40 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- audit_logs ---
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').notNull(),
  adminEmail: varchar('admin_email', { length: 200 }).notNull(),
  action: varchar('action', { length: 200 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 300 }).notNull(),
  params: jsonb('params').notNull().default({}),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// --- Inferred row types (replace the old TypeORM entity classes) ---
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type IncidentParticipant = typeof incidentParticipants.$inferSelect;
export type IncidentActionLog = typeof incidentActionLogs.$inferSelect;
export type SkillVerification = typeof skillVerifications.$inferSelect;
export type ConsentRecord = typeof consentRecords.$inferSelect;
export type RiskZone = typeof riskZones.$inferSelect;
export type BreakoutMessage = typeof breakoutMessages.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Hospital = typeof hospitals.$inferSelect;
export type DriverDispatch = typeof driverDispatches.$inferSelect;
export type InstitutionalContact = typeof institutionalContacts.$inferSelect;
export type InstitutionalDispatch = typeof institutionalDispatches.$inferSelect;
export type DrillScenario = typeof drillScenarios.$inferSelect;
export type DrillSession = typeof drillSessions.$inferSelect;
export type DrillResponse = typeof drillResponses.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ArticleSave = typeof articleSaves.$inferSelect;
export type ArticleComment = typeof articleComments.$inferSelect;
