-- Week02 MVP schema draft (PostgreSQL style)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  display_name VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS explanation_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fungus_type VARCHAR(64) NOT NULL,
  host_type VARCHAR(64) NOT NULL,
  day INTEGER NOT NULL,
  symptoms TEXT NOT NULL,
  stage_name VARCHAR(128) NOT NULL,
  biology_explanation TEXT NOT NULL,
  host_behavior_change TEXT NOT NULL,
  teaching_point TEXT NOT NULL,
  safety_note TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_templates (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name VARCHAR(128) NOT NULL,
  input_payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explanation_user_created
  ON explanation_records(user_id, created_at DESC);
