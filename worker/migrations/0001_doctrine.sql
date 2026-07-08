CREATE TABLE IF NOT EXISTS doctrine_versions (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  operator_id TEXT
);

CREATE TABLE IF NOT EXISTS doctrine_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  classification TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (version_id) REFERENCES doctrine_versions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctrine_chunks_version_hash
  ON doctrine_chunks(version_id, hash);

CREATE INDEX IF NOT EXISTS idx_doctrine_chunks_lookup
  ON doctrine_chunks(version_id, classification, approved);

CREATE TABLE IF NOT EXISTS doctrine_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  classification TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doctrine_access_logs_lookup
  ON doctrine_access_logs(agent_id, version_id, classification, timestamp DESC);

CREATE TABLE IF NOT EXISTS doctrine_acl (
  agent_id TEXT PRIMARY KEY,
  allowed_classifications TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctrine_evidence_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  operator_id TEXT,
  agent_id TEXT,
  version_id TEXT,
  chunk_hash TEXT,
  classification TEXT,
  source_url TEXT,
  timestamp TEXT NOT NULL,
  state TEXT NOT NULL,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_doctrine_evidence_logs_timestamp
  ON doctrine_evidence_logs(timestamp DESC);
