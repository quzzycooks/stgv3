CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TYPE access_level_enum AS ENUM ('OBSERVER','TIER1','TIER2','SKILLED');
--> statement-breakpoint
CREATE TYPE account_status_enum AS ENUM ('ACTIVE','SUSPENDED','INCOMPLETE','DELETED');
--> statement-breakpoint
CREATE TYPE professional_skill_enum AS ENUM ('MEDICAL_DOCTOR','NURSE_PARAMEDIC','FIRST_AID','FIREFIGHTER','LOGISTICS','TRAFFIC_CONTROL');
--> statement-breakpoint
CREATE TYPE skill_verification_status_enum AS ENUM ('NONE','PENDING','APPROVED','REJECTED');
--> statement-breakpoint
CREATE TYPE trigger_type_enum AS ENUM ('MANUAL','WELFARE_ESCALATION','WEARABLE');
--> statement-breakpoint
CREATE TYPE incident_type_enum AS ENUM ('RTA','MEDICAL_COLLAPSE','FIRE','DROWNING','BUILDING_COLLAPSE','CROWD_CRUSH','UNKNOWN');
--> statement-breakpoint
CREATE TYPE incident_status_enum AS ENUM ('ACTIVE','UNDER_CONTROL','TRANSFERRED','CLOSED','FALSE_ALARM');
--> statement-breakpoint
CREATE TYPE breakout_role_enum AS ENUM ('COORDINATOR','MEDICAL_LEAD','TRANSPORT','SAFETY_MONITOR','INFO_OFFICER','OBSERVER');
--> statement-breakpoint
CREATE TYPE action_type_enum AS ENUM ('STATUS_CHANGE','ROLE_ASSIGNED','MESSAGE','AI_QUERY','TRANSPORT_DISPATCHED','HOSPITAL_RECOMMENDED','INSTITUTIONAL_NOTIFIED','WELFARE_PROMPT','WELFARE_RESPONSE','PROXIMITY_ALERT','PROXIMITY_CONFIRMED','ESCALATION_STARTED','CONTACT_NOTIFIED','MODERATOR_ACTION','INCIDENT_CREATED','INCIDENT_MERGED');
--> statement-breakpoint
CREATE TYPE consent_category_enum AS ENUM ('LOCATION_FOREGROUND','LOCATION_BACKGROUND','MEDICAL_PROCESSING','EMERGENCY_CONTACT_NOTIFY','DATA_MODEL_TRAINING','MICROPHONE_DETECTION');
--> statement-breakpoint
CREATE TYPE driver_status_enum AS ENUM ('OFFLINE','AVAILABLE','DISPATCHED');
--> statement-breakpoint
CREATE TYPE dispatch_status_enum AS ENUM ('OFFERED','ACCEPTED','DECLINED','TIMEOUT','NO_SHOW','ARRIVED','DROPOFF','CANCELLED');
--> statement-breakpoint
CREATE TYPE institution_type_enum AS ENUM ('POLICE','LASEMA','SEMA','FIRE_SERVICE');
--> statement-breakpoint
CREATE TYPE dispatch_channel_enum AS ENUM ('SMS','EMAIL');
--> statement-breakpoint
CREATE TYPE delivery_status_enum AS ENUM ('QUEUED','SENT','DELIVERED','FAILED','FLAGGED');
--> statement-breakpoint
CREATE TYPE drill_category_enum AS ENUM ('RTA','MEDICAL_COLLAPSE','FIRE','DROWNING','CROWD_CRUSH','UNKNOWN_VICTIM','CHILD','NIGHT');
--> statement-breakpoint
CREATE TYPE drill_difficulty_enum AS ENUM ('BASIC','MEDIUM','ADVANCED');
--> statement-breakpoint
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash CHAR(64) NOT NULL,
  phone_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  state_lga VARCHAR(100),
  profile_photo_url TEXT,
  medical_info TEXT,
  access_level access_level_enum NOT NULL DEFAULT 'OBSERVER',
  drill_completion_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  safe_mode_until TIMESTAMPTZ,
  welfare_check_delay_sec INTEGER NOT NULL DEFAULT 120,
  professional_skill professional_skill_enum,
  skill_verification_status skill_verification_status_enum NOT NULL DEFAULT 'NONE',
  skill_verified BOOLEAN NOT NULL DEFAULT false,
  account_status account_status_enum NOT NULL DEFAULT 'INCOMPLETE',
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ
);
--> statement-breakpoint
CREATE UNIQUE INDEX ux_users_phone_hash ON users (phone_hash);
--> statement-breakpoint
CREATE INDEX ix_users_deletion_due ON users (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;
--> statement-breakpoint
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_hash CHAR(64) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT false,
  opted_out BOOLEAN NOT NULL DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_ec_user ON emergency_contacts (user_id);
--> statement-breakpoint
CREATE INDEX ix_ec_phone_hash ON emergency_contacts (phone_hash);
--> statement-breakpoint
CREATE TABLE incidents (
  incident_id VARCHAR(26) PRIMARY KEY,
  triggering_user_id UUID,
  trigger_type trigger_type_enum NOT NULL,
  incident_type incident_type_enum NOT NULL,
  status incident_status_enum NOT NULL DEFAULT 'ACTIVE',
  gps_lat DECIMAL(9,6) NOT NULL,
  gps_lng DECIMAL(9,6) NOT NULL,
  gps_accuracy_meters DOUBLE PRECISION,
  geom GEOGRAPHY(Point, 4326),
  hospital_id UUID,
  transport_driver_id UUID,
  false_alarm_reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurred_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  anonymized_at TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ix_incidents_status ON incidents (status);
--> statement-breakpoint
CREATE INDEX ix_incidents_created_at ON incidents (created_at);
--> statement-breakpoint
CREATE INDEX gix_incidents_geom ON incidents USING GIST (geom);
--> statement-breakpoint
CREATE TABLE incident_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(26) NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  proximity_confirmed BOOLEAN,
  proximity_flagged_silent BOOLEAN NOT NULL DEFAULT false,
  breakout_room_role breakout_role_enum,
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  joined_breakout_at TIMESTAMPTZ,
  left_breakout_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX ux_ip_incident_user ON incident_participants (incident_id, user_id);
--> statement-breakpoint
CREATE INDEX ix_ip_user ON incident_participants (user_id);
--> statement-breakpoint
CREATE TABLE incident_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(26) NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  actor_session_token VARCHAR(64),
  action_type action_type_enum NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_ial_incident_ts ON incident_action_logs (incident_id, timestamp);
--> statement-breakpoint
CREATE TABLE skill_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill professional_skill_enum NOT NULL,
  document_url TEXT NOT NULL,
  status skill_verification_status_enum NOT NULL DEFAULT 'PENDING',
  reviewer_admin_id UUID,
  review_notes VARCHAR(1000),
  sla_due_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ix_sv_status ON skill_verifications (status);
--> statement-breakpoint
CREATE INDEX ix_sv_user ON skill_verifications (user_id);
--> statement-breakpoint
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category consent_category_enum NOT NULL,
  granted BOOLEAN NOT NULL,
  policy_version VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_consent_user_cat ON consent_records (user_id, category);
--> statement-breakpoint
CREATE TABLE user_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gps_lat DECIMAL(9,6) NOT NULL,
  gps_lng DECIMAL(9,6) NOT NULL,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy_meters DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX gix_user_locations_geom ON user_locations USING GIST (geom);
--> statement-breakpoint
CREATE TABLE risk_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_lat DECIMAL(9,6) NOT NULL,
  center_lng DECIMAL(9,6) NOT NULL,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  incident_count INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX gix_risk_zones_geom ON risk_zones USING GIST (geom);
--> statement-breakpoint
CREATE TABLE breakout_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(26) NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role breakout_role_enum,
  content TEXT NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_bm_incident_ts ON breakout_messages (incident_id, created_at);
--> statement-breakpoint
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  vehicle_description VARCHAR(200) NOT NULL,
  plate_number VARCHAR(20) NOT NULL,
  license_verified BOOLEAN NOT NULL DEFAULT false,
  vehicle_inspected BOOLEAN NOT NULL DEFAULT false,
  background_checked BOOLEAN NOT NULL DEFAULT false,
  training_completed BOOLEAN NOT NULL DEFAULT false,
  status driver_status_enum NOT NULL DEFAULT 'OFFLINE',
  gps_lat DECIMAL(9,6),
  gps_lng DECIMAL(9,6),
  geom GEOGRAPHY(Point, 4326),
  no_show_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX gix_drivers_geom ON drivers USING GIST (geom);
--> statement-breakpoint
CREATE INDEX ix_drivers_status ON drivers (status);
--> statement-breakpoint
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  contact_phone VARCHAR(20),
  gps_lat DECIMAL(9,6) NOT NULL,
  gps_lng DECIMAL(9,6) NOT NULL,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  trauma_level INTEGER NOT NULL DEFAULT 1,
  has_cath_lab BOOLEAN NOT NULL DEFAULT false,
  availability DOUBLE PRECISION,
  opted_out BOOLEAN NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE INDEX gix_hospitals_geom ON hospitals USING GIST (geom);
--> statement-breakpoint
CREATE TABLE driver_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(26) NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id),
  status dispatch_status_enum NOT NULL DEFAULT 'OFFERED',
  radius_km INTEGER NOT NULL,
  hospital_id UUID,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  dropoff_at TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ix_dd_incident ON driver_dispatches (incident_id);
--> statement-breakpoint
CREATE INDEX ix_dd_driver_status ON driver_dispatches (driver_id, status);
--> statement-breakpoint
CREATE TABLE institutional_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type institution_type_enum NOT NULL,
  city_zone VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(200),
  active BOOLEAN NOT NULL DEFAULT true
);
--> statement-breakpoint
CREATE INDEX ix_ic_zone ON institutional_contacts (city_zone);
--> statement-breakpoint
CREATE TABLE institutional_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(26) NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  channel dispatch_channel_enum NOT NULL,
  status delivery_status_enum NOT NULL DEFAULT 'QUEUED',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error VARCHAR(500),
  packet JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_id_incident ON institutional_dispatches (incident_id);
--> statement-breakpoint
CREATE INDEX ix_id_status ON institutional_dispatches (status);
--> statement-breakpoint
CREATE TABLE drill_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  category drill_category_enum NOT NULL,
  difficulty drill_difficulty_enum NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_ds_category ON drill_scenarios (category);
--> statement-breakpoint
CREATE TABLE drill_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES drill_scenarios(id),
  option_order JSONB NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ix_dsess_user ON drill_sessions (user_id);
--> statement-breakpoint
CREATE TABLE drill_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL,
  category drill_category_enum NOT NULL,
  chosen_option_id VARCHAR(64) NOT NULL,
  correct BOOLEAN NOT NULL,
  time_to_decision_ms INTEGER NOT NULL,
  hesitation_events INTEGER NOT NULL DEFAULT 0,
  gaming_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_dr_user_scenario ON drill_responses (user_id, scenario_id);
--> statement-breakpoint
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(200) NOT NULL,
  name VARCHAR(200),
  role VARCHAR(40) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX ux_admins_email ON admins (email);
--> statement-breakpoint
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_email VARCHAR(200) NOT NULL,
  action VARCHAR(200) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(300) NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_audit_admin_ts ON audit_logs (admin_id, created_at);
