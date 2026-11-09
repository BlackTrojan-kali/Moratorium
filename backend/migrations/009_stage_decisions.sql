-- Stage decisions: structured grounds recorded by each decision actor.
-- request_approvals.note already stores the decision grounds text; these columns
-- keep the legally meaningful extras separate so they can be reported on.
ALTER TABLE request_approvals ADD COLUMN legal_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE request_approvals ADD COLUMN assessment TEXT NOT NULL DEFAULT '';
ALTER TABLE request_approvals ADD COLUMN remission BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE request_approvals ADD COLUMN remission_rationale TEXT NOT NULL DEFAULT '';
-- 'approve' or 'reject' once the actor at this stage has decided; NULL while waiting.
ALTER TABLE request_approvals ADD COLUMN decided_action TEXT
  CHECK (decided_action IS NULL OR decided_action IN ('approve','reject'));
CREATE INDEX approvals_decided ON request_approvals(request_id,decided_action) WHERE decided_action IS NOT NULL;
