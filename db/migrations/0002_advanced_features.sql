/**
 * Migration: Advanced Features (v1.4.0)
 * Adds support for:
 * - User Management (multi-user with roles)
 * - Chart Annotations (mark events on charts)
 * - Scheduled Reports (automated report generation)
 * - Custom Calculations (derived metrics)
 * - Data Quality Monitoring (track data completeness)
 * - Anomaly Detection (statistical anomaly tracking)
 */

-- User Management
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- admin, user, viewer
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_permissions_user_resource_idx ON user_permissions(user_id, resource);

-- Chart Annotations
CREATE TABLE IF NOT EXISTS chart_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ,
  type TEXT NOT NULL DEFAULT 'event', -- event, deployment, incident, maintenance
  severity TEXT, -- info, warning, critical
  color TEXT DEFAULT '#3b82f6',
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL, -- Cron expression
  type TEXT NOT NULL DEFAULT 'dashboard', -- dashboard, metrics, alerts
  format TEXT NOT NULL DEFAULT 'pdf', -- pdf, excel, json
  recipients JSONB NOT NULL, -- Email addresses array
  configuration JSONB NOT NULL, -- Dashboard ID, metrics, time range, etc.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scheduled_reports_next_run_idx ON scheduled_reports(next_run);
CREATE INDEX IF NOT EXISTS scheduled_reports_active_idx ON scheduled_reports(is_active);

CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  file_path TEXT,
  file_size TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS report_history_report_id_idx ON report_history(report_id);

-- Custom Calculations
CREATE TABLE IF NOT EXISTS custom_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT NOT NULL,
  source_metric_ids JSONB NOT NULL,
  unit TEXT,
  aggregation_type TEXT DEFAULT 'none', -- none, sum, avg, min, max
  metadata JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS derived_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID NOT NULL REFERENCES custom_calculations(id) ON DELETE CASCADE,
  time TIMESTAMPTZ NOT NULL,
  value TEXT NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS derived_metrics_calc_time_idx ON derived_metrics(calculation_id, time DESC);

-- Data Quality Monitoring
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  expected_count DOUBLE PRECISION,
  actual_count DOUBLE PRECISION,
  missing_count DOUBLE PRECISION,
  completeness DOUBLE PRECISION, -- Percentage (0-100)
  latency DOUBLE PRECISION, -- Average latency in ms
  out_of_order_count DOUBLE PRECISION,
  duplicate_count DOUBLE PRECISION,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS data_quality_metric_time_idx ON data_quality_metrics(metric_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS data_quality_device_time_idx ON data_quality_metrics(device_id, timestamp DESC);

-- Anomaly Detection
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  expected_value DOUBLE PRECISION,
  z_score DOUBLE PRECISION,
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  type TEXT NOT NULL DEFAULT 'statistical', -- statistical, threshold, pattern, ml
  description TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS anomalies_metric_time_idx ON anomalies(metric_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS anomalies_device_time_idx ON anomalies(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS anomalies_severity_idx ON anomalies(severity);
CREATE INDEX IF NOT EXISTS anomalies_acknowledged_idx ON anomalies(acknowledged);

CREATE TABLE IF NOT EXISTS anomaly_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL DEFAULT 'z-score', -- z-score, isolation-forest, prophet
  parameters JSONB NOT NULL,
  training_data JSONB,
  mean DOUBLE PRECISION,
  std_dev DOUBLE PRECISION,
  threshold DOUBLE PRECISION DEFAULT 3.0,
  last_trained TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS anomaly_models_metric_idx ON anomaly_models(metric_id);

-- Comments
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE chart_annotations IS 'User-created annotations and event markers on charts';
COMMENT ON TABLE scheduled_reports IS 'Automated report generation and delivery configuration';
COMMENT ON TABLE custom_calculations IS 'User-defined derived metrics and calculations';
COMMENT ON TABLE data_quality_metrics IS 'Data quality monitoring metrics';
COMMENT ON TABLE anomalies IS 'Detected anomalies with statistical analysis';
COMMENT ON TABLE anomaly_models IS 'Anomaly detection model parameters and training data';
