-- Operator OS v3 audit ledger (D1)
CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  operator_id TEXT,
  action_class TEXT NOT NULL,
  system_target TEXT NOT NULL,
  beacon_hash TEXT NOT NULL,
  codex_hash TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  proposal_id TEXT,
  approval_id TEXT,
  risk_score REAL NOT NULL,
  result TEXT NOT NULL,
  payload_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_proposal_id ON audit_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp);
