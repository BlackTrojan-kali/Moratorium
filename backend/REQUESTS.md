# Requests and decisions across all actors

This increment adds the request workflow to the existing Node.js/PostgreSQL application. It preserves the existing employer request list, details, document list, navigation shell and authentication. It adds connected forms and staff actions, migration 003, request documents, history, approval stages and internal notifications.

## Use the workflow

1. Restart the backend after applying `npm run migrate`. Start the frontend as usual.
2. As employer: New request → enter employer contact details, debt amount, proposed months and reason → upload required documents → confirm the declaration → submit. Saved drafts and returned files remain editable.
3. As administrator: Requests → open a submitted file → select an active AGENT (DT), competent route, delegation reference and ordered decision actors. The final stage is the final decision-maker. Assignment is explicit; no account receives legal signing authority merely by holding a staff role.
4. As AGENT (DT): open an assigned file, review its data and documents, attach the CPS opinion, then either return it with a reason or record a recommendation and forward it.
5. As CPS: inspect the deposit evidence and enter the verified amount and payment reference. This records verification; it does not book a payment or call TOMPRO.
6. As a decision actor (CE / CEA, S-DCT, DT, DG): Awaiting decision shows files at your current approval stage. Endorse and forward, return to the AGENT (DT), or reject with grounds. The final endorsement marks the request Approved. Each approval requires CPS confirmation of at least 30% of the stated debt.
7. As administrator: Requests and Audit trail provide read-only access to submitted requests, supporting documents, approval progress and timestamped events.

Employer users can access only their organization. AGENT (DT) accounts can access only assigned files. Decision actors can access only files in their approval chains. Administrators and CPS can view submitted files, but cannot read unsubmitted drafts belonging to employers. Server checks apply independently of the UI.

## Request state and integrity

Draft → Under review → Recommended → Approved or Rejected.

The AGENT (DT) may return Under review files to Action required; the employer can correct and resubmit. A decision actor can return Recommended files to Under review. Returns clear earlier endorsements. Changed employer data or documents invalidate deposit confirmation. Decided files are immutable through the API; an employer can only delete a draft that was never submitted.

Each mutation requires the current integer version. A transaction locks the request row, checks ownership, role and stage, applies the change, increments the version and records history/audit/notifications. Competing edits receive HTTP 409 and must reload. Rejection and return require reasons; endorsement requires decision grounds and the relevant legal/delegation reference. Approval-chain changes are logged with stage names and responsible staff.

## Files and notifications

Required on submission: debt statement, deposit proof and evidence of difficulty. A signed request letter is optional. CPS opinion is required before recommendation. These categories follow the project note; the source specification says the definitive list still requires business confirmation.

Files are limited to PDF, PNG and JPEG signatures, 5 MiB each, 20 active documents per request. Content is stored in PostgreSQL BYTEA, fetched only after authorization, and downloaded as attachments. Removal archives a document instead of deleting it. File-signature checks are not malware scanning; a production scanning service remains necessary before opening untrusted content. File limits are implementation limits, not regulatory rules.

Internal notifications are created in the same transaction as workflow events. Assigned actors and the owning employer receive updates, and CPS receives approval notices. Notifications are only readable by their recipient while they retain access to the request. Email delivery is not configured.

## Routing and source decisions

Sources reviewed in the MTX project documents:
- note-cadrage-moratoires_stagiaire.docx
- Specification_Fonctionnelle_Processus_Demande_de_Moratoire-2.docx
- Cahier_des_charges_Processus_Daccord_Refus_de_Demande_de_Moratoire.docx

The application remains Node.js/PostgreSQL with the employer frontend as instructed by the user, despite older source documents describing Java/Oracle and an internal-only portal.

Duration guidance is 1–6 months Centre, 7–11 Regional, 13+ Technical. Exactly 12 months is ambiguous in the specification (both 7–12 and 12+ are stated), so an administrator must explicitly choose Regional or Technical and record the basis. Requests containing a remission request route to General Directorate. A technical input ceiling of 600 months prevents unreasonable input; it is not an authorized repayment maximum. Amounts are positive whole XAF values bounded to JavaScript's safe integer range, but monetary comparisons use BigInt.

The configured approval chain represents the locally assigned sequence. Real signature delegations and the definitive hierarchy must be confirmed by CNPS before operational deployment. There is no automatic authority lookup or integration with an institutional directory.

## API

GET/POST /api/v1/requests lists/creates requests. GET /api/v1/requests/:id reads a complete authorized file. Lists use page (50 records), q, status and view parameters. Views include work-queue, returned, decisions and decision-history.

POST /api/v1/requests/:id/:action supports save, documents, remove-document, submit, assign, return, recommend, confirm-deposit, approve, reject. JSON input always includes version. Documents adds kind, fileName and base64 data; the API validates and stores binary content.

GET /api/v1/employer returns the signed-in employer organization. GET /api/v1/workflow/staff is administrator-only. GET /api/v1/documents lists accessible files; GET /api/v1/documents/:id/download downloads one. GET /api/v1/notifications lists up to 100 notifications; POST /api/v1/notifications/:id/read marks an owned notification read, and POST /api/v1/notifications/read-all marks every unread notification of the signed-in user. Notifications are served by the request service, which is the single owner of /api/v1/notifications.

## Remaining work

This is the request-processing increment, not completion of the entire project. Payment schedules and manually verified accounting observations are now implemented in migration 005 (see ACTOR_FEATURES.md). Signed official agreement/rejection PDFs, electronic signatures, separate remission decisions, standalone remission applications and automated EnergiZer/TOMPRO/email integrations remain outside the implemented scope. The remission flag currently records the request and determines routing; it does not calculate or grant a penalty waiver. Dashboard payment metrics and other unconnected modules retain their existing frontend state.

## Validation

PostgreSQL integration tests cover submission, required documents, organization isolation, assigned access, download authorization, returns/resubmission, ordered approvals, exact 30% arithmetic, immutable decisions, notification scoping, stale versions, and concurrent edits. Authentication regression tests cover all six roles. The frontend production build passes. Headless browser checks exercise employer creation/upload/submission, administrator assignment, and request navigation for all six roles using isolated test accounts.


## Employer request deposit integration (migration 004)

The current employer Deposit pages use /api/v1/deposits. These endpoints operate on the same moratorium_requests records and call the same transactional workflow as staff /requests actions; they do not create a separate business process.

- GET /deposits/options returns permitted request types, document rules, status choices, employer identity and a session-bound CSRF token.
- GET /deposits and /deposits/documents support q, status, page and 50-row pagination.
- POST /deposits creates a draft. PUT /deposits/:id saves a draft or returned request.
- POST /deposits/:id/documents accepts JSON kind, fileName and base64 data. DELETE /deposits/:id/documents/:documentId archives an attachment. GET .../content downloads it after ownership checks.
- POST /deposits/:id/validate checks saved fields and required files. POST .../submit requires declaration=true and creates a receipt in the same transaction.
- Writes require the configured browser Origin and X-CSRF-Token. Existing-record writes require a quoted integer If-Match version. Create/submit additionally require an Idempotency-Key (16–100 letters, digits or hyphens). Matching retries replay the saved response; conflicting reuse returns 409. A replay can represent an older version: reload before further editing.

Migration 004 adds the current submission receipt, append-only receipt snapshots for every new submission, and durable idempotency responses. Existing submitted requests keep their history; no historical receipts are fabricated. Each resubmission gets a new snapshot while earlier snapshots remain in request_submission_receipts. The employer can print the latest receipt; it acknowledges receipt only, not approval.

The form supports moratorium and moratorium with remission, contact details, declared debt, declared advance and remission grounds. The declared advance is separate from CPS verification. Standalone remission and independently signed remission decisions remain outside this implementation. The registered employer status and external debt are unavailable until their source is integrated; submission permission comes from the authenticated account and the server's request state checks.

File status ready means a supported file signature was accepted. It does not mean antivirus verification. The UI states this explicitly. Employers cannot upload a CPS opinion; the responsible processor supplies it.

Validation: backend tests cover all six actors plus employer isolation, concurrent duplicate creation, stale versions, forbidden CPS upload, file removal/download, submission retries, returned corrections and receipt preservation. Browser smoke tests cover the new employer form/receipt and staff request access/assignment.
