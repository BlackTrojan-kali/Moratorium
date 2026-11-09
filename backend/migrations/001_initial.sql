CREATE TABLE employers (
  id TEXT PRIMARY KEY NOT NULL,
  cnps_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employer','agent_dt','ce_cea','s_dct','dt','dg','cps','administrator')),
  employer_id TEXT REFERENCES employers(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK((role = 'employer' AND employer_id IS NOT NULL) OR (role != 'employer' AND employer_id IS NULL))
);

CREATE TABLE moratorium_requests (
  id TEXT PRIMARY KEY NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  employer_id TEXT NOT NULL REFERENCES employers(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Under review','Action required','Recommended','Approved','Rejected','Active','Completed','Overdue')),
  debt_amount_xaf BIGINT CHECK(debt_amount_xaf BETWEEN 1 AND 9007199254740991),
  proposed_months INTEGER CHECK(proposed_months > 0),
  reason TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX requests_employer_status ON moratorium_requests(employer_id, status);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT REFERENCES moratorium_requests(id),
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_request_time ON audit_events(request_id, created_at);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

