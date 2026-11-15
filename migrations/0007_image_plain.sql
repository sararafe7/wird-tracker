-- Per image: show it on the screenshot header without the tinted circle (for light logos on transparent
-- backgrounds). Off by default, which keeps the circle.
ALTER TABLE initiatives ADD COLUMN logo_plain INTEGER NOT NULL DEFAULT 0;
ALTER TABLE groups ADD COLUMN icon_plain INTEGER NOT NULL DEFAULT 0;
