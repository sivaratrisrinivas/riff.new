import { Database } from 'bun:sqlite';

export const db = new Database('riff.sqlite');

// Initialize schema
db.run(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  fp TEXT NOT NULL,
  persona TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fingerprints (
  fp TEXT PRIMARY KEY,
  text_hash TEXT NOT NULL,
  personas TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  run_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  chain_id TEXT,
  text_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  FOREIGN KEY (chain_id) REFERENCES chains(id)
);

CREATE TABLE IF NOT EXISTS run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS shares (
  slug TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (chain_id) REFERENCES chains(id)
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_created ON fingerprints(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_state_run_at ON jobs(state, run_at);
CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON run_events(run_id);
CREATE INDEX IF NOT EXISTS idx_insights_fp ON insights(fp);
`);

