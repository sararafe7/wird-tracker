-- Wird: groups of girls reading a daily Quran wird, run by managers under a supervisor.
-- Supervisors are not stored here: they are the emails in the SUPERVISOR_EMAILS setting.

-- Managers, added by the supervisor by email; user_id links the Hasanat account on first sign-in
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  user_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- position orders members within a group; it is the number the girls reply with
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  daily INTEGER NOT NULL CHECK (daily BETWEEN 1 AND 604),
  start_page INTEGER NOT NULL CHECK (start_page BETWEEN 1 AND 604),
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per member per wird day; value multiplies daily pages, 0 counts the day without moving
CREATE TABLE records (
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value REAL NOT NULL CHECK (value >= 0),
  daily INTEGER NOT NULL,
  PRIMARY KEY (member_id, date)
);

CREATE TABLE marks (
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('kahf', 'mulk')),
  PRIMARY KEY (member_id, date, kind)
);

CREATE INDEX idx_groups_manager ON groups(manager_id);
CREATE INDEX idx_members_group ON members(group_id, position);
