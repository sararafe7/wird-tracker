-- Initiatives: containers of groups, each led by one or more supervisors. Anyone who signs in can create one.
-- App admins are the emails in SUPERVISOR_EMAILS; they are not stored here.
CREATE TABLE initiatives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  -- Who created it, for the limit on initiatives per person
  created_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  -- 1 until an app admin signs in: that admin then becomes its supervisor (used once, for the existing data)
  adopt_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE initiative_supervisors (
  initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (initiative_id, staff_id)
);

CREATE INDEX idx_initiative_supervisors_staff ON initiative_supervisors(staff_id);

-- Every group belongs to one initiative; deleting the initiative deletes its groups, members and records.
-- Added as a column (not a rebuilt table) so existing members and records stay untouched.
ALTER TABLE groups ADD COLUMN initiative_id TEXT REFERENCES initiatives(id) ON DELETE CASCADE;
CREATE INDEX idx_groups_initiative ON groups(initiative_id);

-- Everything that exists today moves into one initiative
INSERT INTO initiatives (id, name, adopt_admin) VALUES ('fa-ahyaynahu', 'فأحييناه', 1);
UPDATE groups SET initiative_id = 'fa-ahyaynahu';
INSERT INTO initiative_supervisors (initiative_id, staff_id)
  SELECT 'fa-ahyaynahu', id FROM staff WHERE role = 'supervisor';

-- Roles now come from initiative_supervisors and groups.manager_id
ALTER TABLE staff DROP COLUMN role;
