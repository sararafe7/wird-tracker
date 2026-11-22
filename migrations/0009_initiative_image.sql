-- Images move from groups to initiatives: one image per initiative, shown on the tables and weekly
-- cards of all its groups, set by its supervisors. «بدون دائرة» (logo_plain) works as before.
-- Group icons are dropped; they will be uploaded again as initiative images.
ALTER TABLE initiatives ADD COLUMN logo TEXT;
ALTER TABLE initiatives ADD COLUMN logo_version TEXT;
ALTER TABLE initiatives ADD COLUMN logo_plain INTEGER NOT NULL DEFAULT 0;
ALTER TABLE groups DROP COLUMN icon;
ALTER TABLE groups DROP COLUMN icon_version;
ALTER TABLE groups DROP COLUMN icon_plain;
