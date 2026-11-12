-- Supervisors can now be added from inside the app, like managers.
-- The main supervisors stay in the SUPERVISOR_EMAILS setting and are not stored here.
ALTER TABLE staff ADD COLUMN role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'supervisor'));
