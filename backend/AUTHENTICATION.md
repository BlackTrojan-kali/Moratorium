# Authentication across all actors

Authentication covers the eight accounts: employer, AGENT (DT), CE / CEA, S-DCT, DT, DG, CPS and administrator. The frontend uses the authenticated server role.

## Start and create the first administrator

1. In backend, run `npm run migrate` to apply migration 002 (sessions, password resets, and login throttling). Existing users and application records are preserved.
2. Run `./create-admin.ps1` in PowerShell. Enter your email, display name and a 12–128 character password locally. No default accounts or passwords are installed. Bootstrap refuses to run once an administrator exists.
3. Restart the API with `npm start`, and start the frontend with `npm run dev` from the project root.
4. Open the frontend at http://localhost:5173 and sign in. In Users, create accounts for all six roles. Employer accounts must link to an existing employer or create an organization with a unique CNPS number.

The configured CORS_ORIGIN must match the frontend's exact origin, including port. Use localhost consistently. If Vite selects another port, stop the competing server or update backend/.env and restart the API.

## Endpoints

All paths below are under /api/v1. POST calls require application/json and the exact configured frontend Origin. Cookies must be included. Sessions expire after eight hours and are revoked on logout, account disablement, and password changes/resets.

- POST /auth/login: email, password. Returns user and sets an HttpOnly, SameSite=Lax cookie.
- POST /auth/sign-up: displayName, email, password. Public self-registration. Always creates an employer account and signs it in; organisation details are completed later from the profile.
- GET /auth/me: current user; never exposes a password hash or raw session token.
- POST /auth/logout: revoke current session and clear cookie.
- POST /auth/change-password: currentPassword, password. Revokes all sessions for the user.
- POST /auth/reset-password: token, password. Consumes a reset token once, revokes all sessions.
- POST /auth/forgot-password: email. Answers with the same message whether or not the address has an account. For an active account it creates a 30-minute single-use token and, because email delivery is not configured, also returns `resetPath` so the link can be handed over.
- GET /admin/users: list up to 500 accounts.
- POST /admin/users/:id/role: administrator-only. Assigns one of the eight roles to an existing account; accounts are created by their owners through sign-up. An administrator cannot change their own role, and the last administrator cannot be demoted.
- GET /admin/employers: list up to 500 organizations for account assignment.
- POST /admin/users/:id/active: active boolean. Cannot disable your own account or the last active administrator.
- POST /admin/users/:id/reset-link: issue a 30-minute one-time token, restricted to administrators. The frontend builds a reset URL with the token in the fragment and displays it for private sharing after identity verification.

Passwords use salted asynchronous scrypt (N=32768, r=8, p=3). Session and reset tokens are random 256-bit values; only hashes are stored. Login limits are stored in PostgreSQL (10 attempts/email and 100/IP per 15 minutes). Audit events record successful authentication and account mutations. IP throttling uses the direct peer address, not untrusted forwarded headers.

## Boundaries and deployment

Email delivery is not configured. The recovery screen therefore displays the one-time link returned by POST /auth/forgot-password instead of claiming that an email was sent; remove the `resetPath` field from the response once an outbound mail service exists. The endpoint message is deliberately identical for known and unknown addresses, but displaying the link for an existing account does disclose that the account exists to anyone who can reach the screen, so this behaviour is intended for controlled deployments only. Reset links are sensitive and must be shared privately. MFA, public employer registration and automatic email recovery are not included in this increment.

Use HTTPS and NODE_ENV=production for Secure cookies in deployment. Configure CORS_ORIGIN for the actual frontend and use a same-site frontend/API deployment. Production TLS, proxy-aware throttling and delivery-provider configuration remain deployment work. Do not reuse the local sslmode=disable connection setting for a remote database requiring TLS.

Existing request and payment screens remain intact; their business APIs are the next phases. Their visibility is filtered by the existing navigation roles, but future data endpoints must enforce organization/assignment permissions independently. Account role changes are not yet exposed; create accounts with the intended role.

## Validation

`npm test` runs HTTP/configuration tests; set TEST_DATABASE_URL to an isolated PostgreSQL database for integration tests. The tests use random schemas and remove those schemas afterward. Authentication tests cover all six roles, forbidden administration, password hashing, session revocation, password changes, one-time resets, disabled accounts, expired sessions and login limits. `npm run build` from the project root validates TypeScript and builds the frontend.
