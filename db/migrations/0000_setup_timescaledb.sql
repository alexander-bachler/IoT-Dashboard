-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table first (referenced by other tables)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Create base tables
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_token TEXT NOT NULL,
  client_id TEXT,
  config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  description TEXT,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric_type TEXT,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS measurements (
  time TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  quality TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS devices_data_source_idx ON devices(data_source_id);
CREATE INDEX IF NOT EXISTS devices_external_id_idx ON devices(external_id);
CREATE INDEX IF NOT EXISTS metrics_device_idx ON metrics(device_id);
CREATE INDEX IF NOT EXISTS metrics_external_id_idx ON metrics(external_id);

-- Convert measurements table to hypertable
-- Partition by time column with 7-day chunks
SELECT create_hypertable(
  'measurements',
  'time',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Create indexes on measurements
CREATE INDEX IF NOT EXISTS measurements_time_idx ON measurements(time DESC);
CREATE INDEX IF NOT EXISTS measurements_metric_time_idx ON measurements(metric_id, time DESC);
CREATE INDEX IF NOT EXISTS measurements_device_time_idx ON measurements(device_id, time DESC);

-- Create continuous aggregate for hourly averages
-- This improves query performance for long time ranges
CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  metric_id,
  device_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS count
FROM measurements
GROUP BY bucket, metric_id, device_id
WITH NO DATA;

-- Add refresh policy to update the continuous aggregate
SELECT add_continuous_aggregate_policy('measurements_hourly',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Create continuous aggregate for daily averages
CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS bucket,
  metric_id,
  device_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS count
FROM measurements
GROUP BY bucket, metric_id, device_id
WITH NO DATA;

-- Add refresh policy for daily aggregate
SELECT add_continuous_aggregate_policy('measurements_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Create retention policy (optional - keeps last 90 days of raw data)
-- Uncomment if you want to automatically drop old data
-- SELECT add_retention_policy('measurements', INTERVAL '90 days', if_not_exists => TRUE);
