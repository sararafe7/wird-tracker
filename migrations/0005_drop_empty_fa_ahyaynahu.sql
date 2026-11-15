-- 0004 created «فأحييناه» even on an empty database. Remove it where there was nothing to move into it:
-- no groups, no supervisors, and no app admin has claimed it yet. Databases with data keep it as it is.
DELETE FROM initiatives
WHERE id = 'fa-ahyaynahu'
  AND adopt_admin = 1
  AND NOT EXISTS (SELECT 1 FROM groups WHERE initiative_id = 'fa-ahyaynahu')
  AND NOT EXISTS (SELECT 1 FROM initiative_supervisors WHERE initiative_id = 'fa-ahyaynahu');
