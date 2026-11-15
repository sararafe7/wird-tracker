-- An initiative's logo and a group's icon: a small image (resized on the phone to 256px, under ~50 KB)
-- kept as a data URL. The version changes on every upload, so browsers can cache each image for good.
ALTER TABLE initiatives ADD COLUMN logo TEXT;
ALTER TABLE initiatives ADD COLUMN logo_version TEXT;
ALTER TABLE groups ADD COLUMN icon TEXT;
ALTER TABLE groups ADD COLUMN icon_version TEXT;
