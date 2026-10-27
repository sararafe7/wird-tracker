-- Groups are for girls or boys; it only changes the wording about members
ALTER TABLE groups ADD COLUMN audience TEXT NOT NULL DEFAULT 'girls' CHECK (audience IN ('girls', 'boys'));
