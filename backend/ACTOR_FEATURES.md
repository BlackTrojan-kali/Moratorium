# Backend features for all eight roles

Migration 005 connects the existing request process to account settings, live dashboards, administration, payment monitoring, reports and audit. All data is stored in PostgreSQL. These features use the same authenticated sessions and request ownership rules as the request module.

## Start using the features

1. Apply migrations with `npm run migrate` from the backend directory, then restart the API. Restart or refresh the frontend.
2. Administrator: create accounts as before. Roles & access explains enforced permissions. Configure the approved recovery grace period and support contact in System settings. No grace period is preselected. Maintain reference centres and employer centre assignments. Workflow rules explains the enforced request and schedule process. Templates edits review-copy correspondence.
3. Employer: create and track requests as before. Dashboard, profile and settings now read saved data. Payment schedule / Payment plans shows authorized schedules, observed instalment payments and closure history. Decision correspondence is available from decided requests.
4. AGENT (DT): review assigned requests, then record recovery follow-up on their payment plans. A dated note produces an in-app notification and history event.
5. CPS: select an approved request under Payment plans. Propose a schedule for exactly the requested number of months and the stated debt minus the verified advance. Review generated dates/amounts before saving. Generation preserves the original day of month, clamping only months with fewer days. The final assigned decision actor validates the schedule before tracking starts.
6. Decision actors (CE / CEA, S-DCT, DT, DG): continue staged request decisions as before. Under Payment plans, the final assigned decision actor reviews the proposed schedule and records approval grounds to activate it. CPS cannot approve its own schedule.
7. CPS: record payments already verified in the accounting source, with transaction reference, payment date, amount and evidence. This does not collect money or post to TOMPRO. Duplicate references and overpayments are rejected. Advances cannot be counted again as instalment payments. Payments are allocated oldest instalment first using exact integer XAF arithmetic.
8. CPS: reconcile a completed period only after checking that all source payments through the selected date were recorded. The approved grace period must be configured. Each missed instalment is counted once; rerunning a period does not increment its count again. Three distinct missed instalments close the plan for default. Full recorded payment closes it for execution. Closure records retain a snapshot and checksum.
9. CPS: reverse an incorrect observation with a reason. The original is retained, and a completed plan reopens if its balance is no longer paid. Previous closure archives remain available. A defaulted plan is locked for payment mutations; legal recovery is an external process.
10. Administrator: manage accounts and roles, assignment and delegation references, reference centres, correspondence templates and system configuration.

## Persistence and access

- Account preferences, phone numbers and settings versions persist across API restarts. Only name and phone are editable in personal account settings. Email/role/official identifiers are not silently reassigned.
- Settings use a session-bound CSRF token and optimistic versions. Other writes require the configured exact browser Origin. Record versions, transactions and request row locks prevent stale or concurrent financial mutations.
- Roles remain one role per account. An administrator has administrative permissions, not automatic decision or CPS authority.
- Staff without stored official identifiers or organization data see unavailable values. No identifier is generated from a user UUID.
- Required notices are in-app. No fictional email delivery setting is offered. Only English is offered until translated UI text exists. Appearance preferences are applied by the existing frontend preferences provider.
- Archives include payment observations, reversals, defaults, recovery notes and request history. Their SHA-256 is calculated over canonical JSON (keys sorted recursively). This is an integrity checksum, not a certified legal timestamp or electronic signature.
- Report monetary totals use exact integers. Period filters select requests by submission date; displayed recovery is the current sum of non-reversed instalment observations for those requests, excluding advances. The report states this basis. Exports are capped at 10,000 requests; narrow dates if exceeded. CSV cells neutralize spreadsheet formula prefixes.

## APIs

All routes below are under `/api/v1` and require authentication.

| Route | Access and behavior |
|---|---|
| GET/POST `/settings/account` | Own profile and versioned settings |
| GET `/dashboard` | Role-scoped requests and payment metrics |
| GET `/help` | Help guides and configured support contact |
| GET `/admin/roles` | Administrator permission catalogue |
| GET `/admin/workflow-rules` | Administrator enforced policy overview |
| GET/POST `/admin/config` | Administrator versioned grace period/contact |
| GET/POST `/admin/reference-data` | Administrator centre directory and employer assignments |
| GET/POST `/admin/templates` | Administrator versioned correspondence templates |
| GET `/payment-plans` | Role-scoped list with page/q/view filters |
| GET `/payment-plans/:requestId` | Authorized plan, instalments, observations and history |
| POST `/payment-plans/:requestId/schedule` | CPS schedule proposal/revision |
| POST `/payment-plans/:requestId/activate` | Final assigned decision actor validation |
| POST `/payment-plans/:requestId/observe` | CPS accounting observation |
| POST `/payment-plans/:requestId/reverse` | CPS correction with reason |
| POST `/payment-plans/:requestId/reconcile` | CPS complete-period verification |
| POST `/payment-plans/:requestId/follow-up` | CPS or assigned AGENT (DT) recovery note |
| GET `/payment-plans/:requestId/archive/:id` | Authorized frozen closure snapshot |
| GET `/audit` | Administrator paginated action log |
| GET `/reports` and `/exports` | Administrator/CPS; from/to/centre filters |
| GET `/correspondence/:requestId/:kind` | Authorized approval/rejection/reminder review copy |

Every payment mutation sends the plan version; initial schedule creation sends the request version. The UI locks further writes after an uncertain result and asks the user to reload saved data. Unique accounting references protect against duplicate recording after uncertain responses.

## Boundaries that need institutional input

Live read-only TOMPRO/ENERGIZER interfaces, automated monthly source retrieval, external email/SMS/legal referral, certified archiving, signed agreements and independent remission decisions are not implemented. The source specifications leave the grace period, referral payload and notification channel to business confirmation. Consequently, reconciliation requires an explicit complete-source attestation and configured grace period; absence of imported data alone never automatically declares default.

Current schedules repay the full stated debt minus the verified advance. A remission request affects request routing only; no penalty waiver or separate residual amount is invented. Separate remission decisions and residual recovery require the authorized assessed/waived amounts and dedicated workflow before use. The source documents exclude accounting entry creation from SIFOR.

The concurrently developed Centres.tsx screen remains intact. Its /admin/centres/options, /admin/centres and /admin/centres/:id contracts are also implemented, including region/address data, assigned staff, CSRF tokens, optimistic versions and idempotent creation. The connected Reference data page uses the same centre records and supports employer and staff assignments.

## Verification

Eight backend test groups cover all six roles, ownership, settings persistence/version checks, configuration, exact XAF allocation, schedules, stage authority, duplicate/advance protection, partial payments, reversals, grace periods, repeat reconciliation, three distinct defaults, archives/checksums, report filters, exports and audit visibility. Existing authentication and request lifecycle regressions also pass.

Hidden-browser tests use isolated PostgreSQL schemas and disposable accounts. They cover administrator pages, CPS schedule generation with month-end dates, decision-actor activation, employer read-only tracking/profile/settings, AGENT (DT) follow-up, administrator report/export/audit, and the existing request submission workflow. No test accounts or test payment records are inserted into the application database.
