-- «أرسلتُ الجدول ✓»: the days a group's manager sent the daily table on WhatsApp
CREATE TABLE table_sends (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, date)
);

-- Initiatives no longer have a logo; only groups keep an icon
ALTER TABLE initiatives DROP COLUMN logo;
ALTER TABLE initiatives DROP COLUMN logo_version;
ALTER TABLE initiatives DROP COLUMN logo_plain;
