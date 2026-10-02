-- Core tables from process/04-design/design.md. Channel-owned tables (outbox, oauth_states)
-- are created by their channel modules (design F7), not here.

CREATE TABLE IF NOT EXISTS users (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- One row per URL polled: baseline (D-027) and freshness (D-014) per feed.
CREATE TABLE IF NOT EXISTS feeds (
  source_id       TEXT NOT NULL REFERENCES sources(id),
  feed_key        TEXT NOT NULL,
  baselined_at    TEXT,
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error      TEXT,
  PRIMARY KEY (source_id, feed_key)
);

CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,                -- `${source_id}:${key}`
  source_id TEXT NOT NULL REFERENCES sources(id),
  key       TEXT NOT NULL,
  label     TEXT NOT NULL,
  declared  INTEGER NOT NULL,                -- 0 = auto-created from unknown data
  UNIQUE (source_id, key)
);

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES sources(id),
  title         TEXT,
  occurred_at   TEXT,
  published_at  TEXT,
  location_text TEXT,
  lat           REAL,
  lon           REAL,
  severity      TEXT,
  link          TEXT,
  is_forecast   INTEGER NOT NULL DEFAULT 0,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  raw           TEXT,
  ingested_at   TEXT NOT NULL,
  notify        INTEGER NOT NULL             -- 0 for baseline items (D-027)
);

-- D-028: one event, several categories.
CREATE TABLE IF NOT EXISTS event_categories (
  event_id    INTEGER NOT NULL REFERENCES events(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  PRIMARY KEY (event_id, category_id)
);

-- Event dedup (D-005): every external ID of an event, unique per source.
CREATE TABLE IF NOT EXISTS event_keys (
  source_id   TEXT NOT NULL,
  external_id TEXT NOT NULL,
  event_id    INTEGER NOT NULL REFERENCES events(id),
  PRIMARY KEY (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS destinations (
  user_id INTEGER NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  config  TEXT NOT NULL,                     -- JSON; never returned unmasked
  label   TEXT,
  PRIMARY KEY (user_id, channel)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id     INTEGER NOT NULL REFERENCES users(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  channel     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, category_id, channel)
);

-- Notification dedup (D-005): one delivery per event, user and channel.
CREATE TABLE IF NOT EXISTS deliveries (
  id         INTEGER PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  channel    TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  error      TEXT,
  created_at TEXT NOT NULL,
  sent_at    TEXT,
  UNIQUE (event_id, user_id, channel)
);
