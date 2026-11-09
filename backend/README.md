# Moratorium PostgreSQL backend

Node.js API with PostgreSQL storage and authentication for all eight roles. See [AUTHENTICATION.md](./AUTHENTICATION.md) for account setup, frontend integration and API details. Request processing is implemented; see [REQUESTS.md](./REQUESTS.md) for the workflow and remaining integration boundaries. Payments are the next phase.

## Setup

Use Node.js 24.15 or newer in the Node 24 release line and an existing PostgreSQL database. From Moratorium:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Set DATABASE_URL in backend/.env to your database connection string, replacing the example username, password, host, port and database name. URL-encode special characters in credentials. Keep .env private. PostgreSQL must already be running and the database must exist; the API does not create databases.

```powershell
npm run migrate
npm start
```

Run migrations only against the intended application database. Migration 001 creates employers, users, moratorium_requests, audit_events and schema_migrations in the connection's default schema. It fails and rolls back if conflicting tables exist; inspect any existing schema before applying it. Migration runners use one transaction and an advisory lock. Normal API startup checks connectivity but does not change the schema.

GET http://localhost:3000/api/v1/health returns {"status":"ok","service":"moratorium-api"} when a PostgreSQL query succeeds. VITE_API_URL in the frontend already matches this prefix. HOST defaults to loopback, PORT to 3000, and CORS_ORIGIN to http://localhost:5173.

## Tests

`npm test` runs HTTP/configuration tests. The PostgreSQL integration test is skipped unless TEST_DATABASE_URL is set:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://test_user:password@localhost:5432/moratorium_test'
npm test
```

Use a dedicated test database. The integration test creates and drops only a randomly named test schema; its user needs schema creation privileges. It checks transactional rollback, concurrent/repeated migration runs, persistent records, foreign keys, role and amount constraints, and case-insensitive email uniqueness.

## Working accounts

`create-accounts.mjs` creates one account per staff actor plus a second employer. It skips accounts that already exist, so it is safe to run again:

```powershell
node --env-file=.env create-accounts.mjs
```

The password is `000000000000` unless ACCOUNT_PASSWORD is set. Accounts: `agent_dt@`, `ce_cea@`, `s_dct@`, `dt@`, `dg@`, `cps@` and `employer2@example.test`, alongside the existing `employer@example.test` and administrator accounts. These are development credentials: create properly named accounts and strong passwords before any real use.

## Database details

- Uses the pg driver with connection pooling, parameterized queries, connection and statement timeouts. TLS is supported through the driver's connection settings; certificate verification is not disabled. Driver documentation: https://node-postgres.com/features/connecting
- Timestamps use TIMESTAMPTZ. Active flags use BOOLEAN. Integer XAF amounts use BIGINT; pg returns these as strings to preserve precision. Convert only after validating bounds in future service code.
- The eight user roles and request statuses match the frontend. Business authorization, state transitions and audit writes are enforced by the request and actor services.
- This replaces the unused SQLite foundation. It does not transfer SQLite data or alter an existing PostgreSQL database automatically. Any old SQLite files remain untouched and are no longer used.

See ACTOR_FEATURES.md for the connected dashboards, administration, settings, payment tracking, audit, reports and exports across all eight roles, and the remaining institutional integration requirements.


