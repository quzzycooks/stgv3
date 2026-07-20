import type {
  AccessLevel,
  AccountStatus,
  ActionType,
  ArticleCategory,
  AuthorBadge,
  BreakoutRole,
  ConsentCategory,
  DispatchStatus,
  DrillCategory,
  DrillDifficulty,
  IncidentStatus,
  IncidentType,
  ProfessionalSkill,
  ReporterRole,
  SkillVerificationStatus,
  TriggerType,
} from "@/lib/enums";

export interface Gps {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

/* ---------------------------------- auth --------------------------------- */

export interface OtpRequestResult {
  devCode?: string;
  resendInSec: number;
}

export interface VerifyResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  accessLevel: AccessLevel;
  registrationComplete: boolean;
}

/* --------------------------------- users ---------------------------------- */

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relationship: string;
  priority?: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  priority: number;
  verified: boolean;
  optedOut: boolean;
}

export interface MedicalInfo {
  bloodType?: string;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
}

export interface ConsentInput {
  category: ConsentCategory;
  granted: boolean;
}

export interface RegisterInput {
  fullName: string;
  dateOfBirth: string;
  stateLga: string;
  profilePhotoUrl?: string;
  emergencyContacts: EmergencyContactInput[];
  medicalInfo?: MedicalInfo;
  consents?: ConsentInput[];
}

export interface UpdateProfileInput {
  fullName?: string;
  stateLga?: string;
  profilePhotoUrl?: string;
  welfareCheckDelaySec?: number;
  medicalInfo?: MedicalInfo;
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  fullName: string;
  dateOfBirth: string;
  stateLga: string;
  profilePhotoUrl: string | null;
  accessLevel: AccessLevel;
  drillCompletionPct: number;
  welfareCheckDelaySec: number;
  professionalSkill: ProfessionalSkill | null;
  skillVerified: boolean;
  skillVerificationStatus: SkillVerificationStatus;
  accountStatus: AccountStatus;
  medicalInfo: MedicalInfo | null;
  emergencyContacts: EmergencyContact[];
}

export interface SubmitSkillInput {
  skill: ProfessionalSkill;
  documentUrl: string;
}

/* ------------------------------- incidents -------------------------------- */

export interface ManualTriggerInput {
  incidentType: IncidentType;
  gps: Gps;
  occurredAt?: string;
  reporterRole?: ReporterRole;
}

export interface Incident {
  incidentId: string;
  triggeringUserId: string | null;
  triggerType: TriggerType;
  reporterRole: ReporterRole;
  incidentType: IncidentType;
  status: IncidentStatus;
  gpsLat: string;
  gpsLng: string;
  gpsAccuracyMeters: number | null;
  hospitalId: string | null;
  transportDriverId: string | null;
  falseAlarmReason: string | null;
  createdAt: string;
  occurredAt: string;
  closedAt: string | null;
}

export interface IncidentDna {
  incidentId: string;
  incidentType: IncidentType;
  status: IncidentStatus;
  createdAt: string;
  occurredAt: string;
  closedAt: string | null;
  responderAggregate: { participants: number; confirmed: number; silent: number };
  timeline: { at: string; type: ActionType; payload: Record<string, unknown> }[];
}

/* -------------------------------- breakout -------------------------------- */

export interface BreakoutMessage {
  id: string;
  incidentId: string;
  senderUserId: string;
  senderRole: BreakoutRole | null;
  content: string;
  flagged: boolean;
  createdAt: string;
}

/* -------------------------------- transport -------------------------------- */

export interface TransportStatus {
  dispatchId?: string;
  status?: DispatchStatus;
  driverId?: string | null;
  etaMinutes?: number | null;
  offeredAt?: string;
  acceptedAt?: string | null;
  arrivedAt?: string | null;
}

export interface HospitalRecommendation {
  id: string;
  name: string;
  contactPhone: string;
  gpsLat: string;
  gpsLng: string;
  traumaLevel: number;
  hasCathLab: boolean;
  distanceKm?: number;
}

/* ---------------------------------- drills --------------------------------- */

/**
 * Options returned pre-submission deliberately omit `kind`/`explanation` —
 * the backend only exposes {id, text} until you've answered, so the answer
 * key can't be read from the network tab.
 */
export interface DrillSessionOption {
  id: string;
  text: string;
}

export interface StartDrillSessionResult {
  sessionId: string;
  scenario: {
    id: string;
    title: string;
    category: DrillCategory;
    difficulty: DrillDifficulty;
    prompt: string;
    options: DrillSessionOption[];
  };
}

export interface DrillResponseResult {
  correct: boolean;
  pointsEarned: number;
  explanation: string;
  correctOptionId?: string;
  accessLevel: AccessLevel;
  completionPct: number;
  gamingFlagged: boolean;
  weakCategories: DrillCategory[];
}

/* ------------------------------ knowledge library --------------------------- */

export interface ArticleAuthor {
  userId: string;
  name: string;
  badge: AuthorBadge;
}

export interface ArticleSummary {
  id: string;
  title: string;
  summary: string;
  category: ArticleCategory;
  author: ArticleAuthor;
  readTimeMinutes: number;
  saveCount: number;
  reviewed: boolean;
  featured: boolean;
  createdAt: string;
  saved: boolean;
}

export interface ArticleListResult {
  featured: ArticleSummary | null;
  articles: ArticleSummary[];
}

export interface ArticleComment {
  id: string;
  content: string;
  flagged: boolean;
  createdAt: string;
  author: ArticleAuthor;
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  comments: ArticleComment[];
}

export interface CreateArticleInput {
  title: string;
  summary: string;
  content: string;
  category: ArticleCategory;
  readTimeMinutes?: number;
}
