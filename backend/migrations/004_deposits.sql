ALTER TABLE moratorium_requests ADD COLUMN submission_receipt JSONB;
CREATE TABLE request_idempotency (
  user_id TEXT NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status INTEGER NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,key)
);

CREATE TABLE request_submission_receipts (
  request_id TEXT NOT NULL REFERENCES moratorium_requests(id),
  request_version INTEGER NOT NULL,
  receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(request_id,request_version)
);
