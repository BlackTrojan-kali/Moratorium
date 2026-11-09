CREATE SEQUENCE request_reference_seq;
ALTER TABLE moratorium_requests
 ADD COLUMN form JSONB NOT NULL DEFAULT '{}',
 ADD COLUMN submitted_at TIMESTAMPTZ,
 ADD COLUMN decided_at TIMESTAMPTZ,
 ADD COLUMN processor_id TEXT REFERENCES users(id),
 ADD COLUMN route TEXT,
 ADD COLUMN routing_basis TEXT,
 ADD COLUMN review_note TEXT,
 ADD COLUMN deposit_amount_xaf BIGINT,
 ADD COLUMN deposit_reference TEXT,
 ADD COLUMN deposit_confirmed_by TEXT REFERENCES users(id),
 ADD COLUMN deposit_confirmed_at TIMESTAMPTZ;
CREATE INDEX requests_processor ON moratorium_requests(processor_id);
CREATE TABLE request_documents (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES moratorium_requests(id),
 kind TEXT NOT NULL,
 file_name TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 content BYTEA NOT NULL CHECK(octet_length(content) BETWEEN 1 AND 5242880),
 uploaded_by TEXT NOT NULL REFERENCES users(id),
 uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 removed_at TIMESTAMPTZ
);
CREATE INDEX documents_request ON request_documents(request_id);
CREATE TABLE request_events (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES moratorium_requests(id),
 actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL,
 from_status TEXT NOT NULL,
 to_status TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX events_request ON request_events(request_id,created_at);
CREATE TABLE request_approvals (
 request_id TEXT NOT NULL REFERENCES moratorium_requests(id),
 position INTEGER NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 label TEXT NOT NULL,
 approved_at TIMESTAMPTZ,
 note TEXT,
 PRIMARY KEY(request_id,position),
 UNIQUE(request_id,user_id)
);
CREATE TABLE notifications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 request_id TEXT NOT NULL REFERENCES moratorium_requests(id),
 message TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 read_at TIMESTAMPTZ
);
CREATE INDEX notifications_user ON notifications(user_id,created_at);
