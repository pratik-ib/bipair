-- API Request Logs table for BipAir admin debugging
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  request_body JSONB,
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  api_key_present BOOLEAN DEFAULT FALSE
);

-- Indexes for fast filtering and sorting
CREATE INDEX IF NOT EXISTS api_logs_timestamp_idx ON api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS api_logs_path_idx ON api_logs(path);
CREATE INDEX IF NOT EXISTS api_logs_status_idx ON api_logs(response_status);
CREATE INDEX IF NOT EXISTS api_logs_method_idx ON api_logs(method);
