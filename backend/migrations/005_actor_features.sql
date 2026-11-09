ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN settings_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN preferences JSONB NOT NULL DEFAULT '{"language":"en","theme":"system","dateFormat":"dd/MM/yyyy"}';
CREATE TABLE service_config (
 id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL DEFAULT 1,
 grace_days INTEGER CHECK(grace_days BETWEEN 0 AND 365), support_contact TEXT NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO service_config(id) VALUES(1);
CREATE TABLE reference_centres (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, version INTEGER NOT NULL DEFAULT 1, region_code TEXT, address TEXT
);
ALTER TABLE users ADD COLUMN centre_id TEXT REFERENCES reference_centres(id);
ALTER TABLE users ADD COLUMN centre_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE employers ADD COLUMN centre_id TEXT REFERENCES reference_centres(id);
ALTER TABLE employers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE TABLE correspondence_templates (
 code TEXT PRIMARY KEY CHECK(code IN('approval','rejection','reminder')),
 title TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
INSERT INTO correspondence_templates(code,title,body) VALUES
 ('approval','Approval record','Request {{reference}} for {{employer}} was approved on {{date}}. Grounds: {{grounds}}. This record is not an electronically signed agreement.'),
 ('rejection','Rejection record','Request {{reference}} for {{employer}} was rejected on {{date}}. Grounds: {{grounds}}.'),
 ('reminder','Payment reminder','Request {{reference}}: an outstanding amount of {{amount}} XAF was identified on {{date}}. Please contact the responsible office before {{deadline}}.');
CREATE TABLE payment_plans (
 id TEXT PRIMARY KEY REFERENCES moratorium_requests(id),
 version INTEGER NOT NULL DEFAULT 1,
 state TEXT NOT NULL DEFAULT 'Draft' CHECK(state IN('Draft','Active','Overdue','Completed','Defaulted')),
 principal_xaf BIGINT NOT NULL CHECK(principal_xaf BETWEEN 1 AND 9007199254740991),
 terms_reference TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 activated_by TEXT REFERENCES users(id), activated_at TIMESTAMPTZ,
 checked_through DATE, checked_at TIMESTAMPTZ, closed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE payment_instalments (
 id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES payment_plans(id),
 position INTEGER NOT NULL, due_date DATE NOT NULL,
 amount_xaf BIGINT NOT NULL CHECK(amount_xaf BETWEEN 1 AND 9007199254740991),
 UNIQUE(plan_id,position)
);
CREATE TABLE observed_payments (
 id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES payment_plans(id),
 reference TEXT NOT NULL UNIQUE, amount_xaf BIGINT NOT NULL CHECK(amount_xaf BETWEEN 1 AND 9007199254740991),
 paid_on DATE NOT NULL, evidence TEXT NOT NULL, recorded_by TEXT NOT NULL REFERENCES users(id),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reversed_at TIMESTAMPTZ,
 reversed_by TEXT REFERENCES users(id), reversal_reason TEXT
);
CREATE TABLE payment_defaults (
 instalment_id TEXT PRIMARY KEY REFERENCES payment_instalments(id),
 plan_id TEXT NOT NULL REFERENCES payment_plans(id), identified_on DATE NOT NULL,
 grace_days INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE recovery_notes (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES moratorium_requests(id),
 actor_id TEXT NOT NULL REFERENCES users(id), note TEXT NOT NULL,
 deadline DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE payment_archives (
 id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES payment_plans(id),
 state TEXT NOT NULL, snapshot JSONB NOT NULL, sha256 TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX instalments_due ON payment_instalments(due_date,plan_id);
CREATE INDEX observed_plan ON observed_payments(plan_id);
CREATE INDEX recovery_request ON recovery_notes(request_id,created_at);
