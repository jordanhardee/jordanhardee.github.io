CREATE TABLE IF NOT EXISTS visitor_sessions (
  token_hash TEXT NOT NULL PRIMARY KEY,
  day_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_day_utc ON visitor_sessions(day_utc);
