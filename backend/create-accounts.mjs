/**
 * Creates the working accounts for the eight roles: one account per staff actor
 * plus a second employer. Run from the backend directory:
 *
 *   node --env-file=.env create-accounts.mjs
 *
 * The password is 12 zeros unless ACCOUNT_PASSWORD is set. Accounts that
 * already exist (matched on email) are left untouched, so the script can be run
 * again safely.
 */
import { openDatabase } from './src/database.mjs';
import { createUser } from './src/auth.mjs';

const password = process.env.ACCOUNT_PASSWORD || '000000000000';

const accounts = [
  { email: 'agent_dt@example.test', name: 'AGENT (DT)', role: 'agent_dt' },
  { email: 'ce_cea@example.test', name: 'CE / CEA', role: 'ce_cea' },
  { email: 's_dct@example.test', name: 'S-DCT', role: 's_dct' },
  { email: 'dt@example.test', name: 'DT — Directeur Technique', role: 'dt' },
  { email: 'dg@example.test', name: 'DG — Directeur Général', role: 'dg' },
  { email: 'cps@example.test', name: 'CPS', role: 'cps' },
  { email: 'employer2@example.test', name: 'Employer two', role: 'employer', organisation: 'Second employer' },
];

const db = openDatabase();

try {
  // Attribute the creations to the first active administrator.
  const admin = (await db.query("SELECT id FROM users WHERE role='administrator' AND active ORDER BY created_at, id LIMIT 1")).rows[0];
  const results = [];

  for (const account of accounts) {
    const existing = await db.query('SELECT role FROM users WHERE lower(email)=lower($1)', [account.email]);

    if (existing.rowCount) {
      results.push([account.email, account.role, `already exists as ${existing.rows[0].role}`]);
      continue;
    }

    await createUser(db, {
      email: account.email,
      displayName: account.name,
      role: account.role,
      password,
      employerName: account.organisation,
      cnpsNumber: null,
    }, admin?.id ?? null);

    results.push([account.email, account.role, 'created']);
  }

  for (const [email, role, status] of results) {
    console.log(`${status.padEnd(26)} ${role.padEnd(13)} ${email}`);
  }

  console.log('\nAccounts per role:');
  const summary = (await db.query('SELECT role, count(*)::int AS accounts, count(*) FILTER (WHERE active)::int AS active FROM users GROUP BY role ORDER BY role')).rows;

  for (const row of summary) {
    console.log(`  ${row.role.padEnd(14)} ${String(row.accounts).padStart(2)} (${row.active} active)`);
  }
} catch (error) {
  console.error(error.status ? error.message : error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
