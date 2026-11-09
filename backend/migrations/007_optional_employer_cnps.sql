-- The employer organisation name and CNPS number are optional when an account
-- registers itself: the person signing up may not know them yet. A NULL
-- cnps_number means "not recorded yet" and can be supplied later by an
-- administrator. Postgres treats NULLs as distinct in a UNIQUE index, so
-- several employers may legitimately await their number.
ALTER TABLE employers ALTER COLUMN cnps_number DROP NOT NULL;
