-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- This migration will be run after the initial Drizzle migration
-- to convert the measurements table to a hypertable

-- Convert measurements table to hypertable
-- Partition by time column with 7-day chunks
SELECT create_hypertable(
  'measurements',
  'time',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

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
