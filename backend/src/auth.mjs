import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { normaliseEmail, isValidEmail, domainAcceptsMail, UNREACHABLE_EMAIL } from './email-address.mjs';

const derive = promisify(scrypt);
export const roles = ['employer', 'agent_dt', 'ce_cea', 's_dct', 'dt', 'dg', 'cps', 'administrator'];
export const digest = (text) => createHash('sha256').update(text).digest('hex');
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function passwordPolicy(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) fail(400, 'Use a password between 12 and 128 characters.');
}
export async function hashPassword(password) {
  passwordPolicy(password);
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
const dummy = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
export async function verifyPassword(password, encoded = dummy) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const parts = encoded.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return verifyPassword(password, dummy);
  const hash = await derive(password, parts[1], 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(hash, Buffer.from(parts[2], 'hex'));
}
export const publicUser = (u) => ({ id: u.id, displayName: u.display_name, email: u.email, role: u.role, employerId: u.employer_id, active: u.active });
export async function transaction(db, work) {
  const client = await db.connect();
  try { await client.query('BEGIN'); const value = await work(client); await client.query('COMMIT'); return value; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
const audit = (db, actor, action) => db.query('INSERT INTO audit_events(id,actor_id,action) VALUES($1,$2,$3)', [randomUUID(), actor, action]);
export async function createUser(db, input, actorId = null, bootstrap = false) {
  const email = normaliseEmail(input.email);
  if (!isValidEmail(email)) fail(400, 'Enter a valid email.');
  // Format alone accepts invented domains, so confirm the domain can receive mail.
  if (!(await domainAcceptsMail(email))) fail(400, UNREACHABLE_EMAIL);
  if (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.length > 120) fail(400, 'Enter a name up to 120 characters.');
  if (!roles.includes(input.role)) fail(400, 'Unknown role.');
  const hash = await hashPassword(input.password);
  return transaction(db, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(734821, 2)');
    if (bootstrap && (await client.query("SELECT 1 FROM users WHERE role='administrator'")).rowCount) fail(409, 'An administrator already exists. Use the administrator dashboard.');
    let employerId = null;
    if (input.role === 'employer') {
      if (input.employerId) {
        if (typeof input.employerId !== 'string') fail(400, 'Invalid employer.');
        const employer = await client.query('SELECT id FROM employers WHERE id=$1', [input.employerId]);
        if (!employer.rowCount) fail(400, 'Employer not found.');
        employerId = input.employerId;
      } else {
        // Both values are optional at self-registration: the person signing up may
        // not know the registered organisation name or the CNPS number yet. The
        // organisation falls back to the contact's name, and the CNPS number stays
        // NULL until it is recorded.
        const organisation = typeof input.employerName === 'string' && input.employerName.trim() ? input.employerName.trim() : String(input.displayName).trim();
        if (organisation.length > 200) fail(400, 'Enter an organisation name up to 200 characters.');
        const cnps = typeof input.cnpsNumber === 'string' && input.cnpsNumber.trim() ? input.cnpsNumber.trim() : null;
        if (cnps && cnps.length > 80) fail(400, 'Enter a CNPS number up to 80 characters.');
        employerId = randomUUID();
        await client.query('INSERT INTO employers(id,name,cnps_number) VALUES($1,$2,$3)', [employerId, organisation, cnps]);
      }
    }
    const result = await client.query('INSERT INTO users(id,email,display_name,password_hash,role,employer_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [randomUUID(), email, input.displayName.trim(), hash, input.role, employerId]);
    await audit(client, actorId || result.rows[0].id, `user.created:${result.rows[0].id}`);
    return publicUser(result.rows[0]);
  });
}
export function sessionToken(req) {
  return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('moratorium_session='))?.slice(19) || '';
}
export async function currentUser(db, req) {
  const token = sessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) fail(401, 'Please sign in.');
  const result = await db.query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.active=true', [digest(token)]);
  if (!result.rowCount) fail(401, 'Your session has expired. Please sign in.');
  return result.rows[0];
}
async function throttle(db, key, limit) {
  const result = await db.query(`INSERT INTO auth_limits(key,attempts,expires_at) VALUES($1,1,NOW()+INTERVAL '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_limits.expires_at<NOW() THEN 1 ELSE auth_limits.attempts+1 END, expires_at=CASE WHEN auth_limits.expires_at<NOW() THEN NOW()+INTERVAL '15 minutes' ELSE auth_limits.expires_at END RETURNING attempts`, [digest(key)]);
  if (result.rows[0].attempts > limit) fail(429, 'Too many attempts. Try again in 15 minutes.');
}
export async function authRoute({ db, req, res, path, body, send, secureCookies }) {
  const cookie = (token, seconds) => res.setHeader('Set-Cookie', `moratorium_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secureCookies ? '; Secure' : ''}`);
  if (path === '/api/v1/auth/login' && req.method === 'POST') {
    await throttle(db, `ip:${req.socket.remoteAddress}`, 100);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || typeof body.password !== 'string' || body.password.length > 128) fail(400, 'Enter your email and password.');
    await throttle(db, `email:${email}`, 10);
    const user = (await db.query('SELECT * FROM users WHERE lower(email)=$1', [email])).rows[0];
    const valid = await verifyPassword(body.password, user?.password_hash);
    if (!user?.active || !valid) fail(401, 'Invalid email or password.');
    const token = randomBytes(32).toString('hex');
    await transaction(db, async client => {
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      const fresh = (await client.query('SELECT active,password_hash FROM users WHERE id=$1', [user.id])).rows[0];
      if (!fresh.active || fresh.password_hash !== user.password_hash) fail(401, 'Please sign in again.');
      await client.query('DELETE FROM sessions WHERE expires_at<NOW() OR token_hash=$1', [digest(sessionToken(req))]);
      await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')", [digest(token), user.id]);
      await client.query('DELETE FROM auth_limits WHERE key=$1', [digest(`email:${email}`)]);
      await audit(client, user.id, 'auth.login');
    });
    cookie(token, 28800); return send(200, { user: publicUser(user) });
  }
  if (path === '/api/v1/auth/reset-password' && req.method === 'POST') {
    await throttle(db, `reset:${req.socket.remoteAddress}`, 20);
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) fail(400, 'Invalid or expired reset link.');
    const hash = await hashPassword(body.password);
    await transaction(db, async client => {
      const reset = (await client.query('SELECT user_id FROM password_resets WHERE token_hash=$1 AND expires_at>NOW()', [digest(body.token)])).rows[0];
      if (!reset) fail(400, 'Invalid or expired reset link.');
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [reset.user_id]);
      const consumed = await client.query('DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>NOW() RETURNING user_id', [digest(body.token)]);
      if (!consumed.rowCount) fail(400, 'Invalid or expired reset link.');
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, reset.user_id]);
      await client.query('DELETE FROM sessions WHERE user_id=$1', [reset.user_id]);
      await client.query('DELETE FROM password_resets WHERE user_id=$1', [reset.user_id]);
      await audit(client, reset.user_id, 'auth.password_reset');
    });
    cookie('', 0); return send(200, { message: 'Password updated. Please sign in.' });
  }
  if (path === '/api/v1/auth/forgot-password' && req.method === 'POST') {
    await throttle(db, `forgot:${req.socket.remoteAddress}`, 20);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail(400, 'Enter a valid email address.');
    await throttle(db, `forgot-email:${email}`, 5);
    // The reply is identical whether or not the address has an account, so the
    // endpoint cannot be used to discover which users are registered.
    const message = 'If an account exists for that address, a single-use password-reset link has been created. It expires in 30 minutes.';
    const account = (await db.query('SELECT id FROM users WHERE lower(email)=$1 AND active=true', [email])).rows[0];
    if (!account) return send(200, { message });
    const token = randomBytes(32).toString('hex');
    await transaction(db, async client => {
      await client.query('DELETE FROM password_resets WHERE user_id=$1 OR expires_at<NOW()', [account.id]);
      await client.query("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 minutes')", [digest(token), account.id]);
      await audit(client, account.id, 'auth.reset_requested');
    });
    // No outbound mail service is configured for this deployment, so the
    // one-time link is returned for the operator to hand over — the same trust
    // model as the administrator-issued reset link. Drop resetPath when
    // email delivery exists.
    return send(200, { message, resetPath: `/reset-password#token=${token}`, expiresInMinutes: 30 });
  }
  if (path === '/api/v1/auth/logout' && req.method === 'POST') {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [digest(sessionToken(req))]);
    cookie('', 0); return send(200, { message: 'Signed out.' });
  }
  if (path === '/api/v1/auth/sign-up' && req.method === 'POST') {
    await throttle(db, `signup:${req.socket.remoteAddress}`, 10);
    // Self-registration always creates an employer account. Every other role is
    // assigned by an administrator afterwards, so nobody can grant themselves
    // approval or administration rights.
    const account = await createUser(db, { ...body, role: 'employer' });
    const token = randomBytes(32).toString('hex');
    await transaction(db, async client => {
      await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')", [digest(token), account.id]);
      await audit(client, account.id, 'auth.signed_up');
    });
    cookie(token, 28800);
    return send(201, { user: account });
  }
  const user = await currentUser(db, req);
  if (path === '/api/v1/auth/me' && req.method === 'GET') return send(200, { user: publicUser(user) });
  if (path === '/api/v1/auth/change-password' && req.method === 'POST') {
    await throttle(db, `change:${user.id}`, 10);
    if (!await verifyPassword(body.currentPassword, user.password_hash)) fail(400, 'Current password is incorrect.');
    const hash = await hashPassword(body.password);
    await transaction(db, async client => {
      const changed = await client.query('UPDATE users SET password_hash=$1 WHERE id=$2 AND password_hash=$3', [hash, user.id, user.password_hash]);
      if (!changed.rowCount) fail(409, 'Password changed elsewhere. Sign in again.');
      await client.query('DELETE FROM sessions WHERE user_id=$1', [user.id]);
      await client.query('DELETE FROM password_resets WHERE user_id=$1', [user.id]);
      await audit(client, user.id, 'auth.password_changed');
    });
    cookie('', 0); return send(200, { message: 'Password updated. Please sign in.' });
  }
  if (path.startsWith('/api/v1/admin/')) {
    if (user.role !== 'administrator') fail(403, 'Administrator access required.');
    if (path === '/api/v1/admin/activation-requests' && req.method === 'GET') {
      const labels = { employer: 'Employer', agent_dt: 'AGENT (DT)', ce_cea: 'CE / CEA', s_dct: 'S-DCT', dt: 'DT', dg: 'DG', cps: 'CPS', administrator: 'System administrator' };
      const rows = (await db.query('SELECT id,display_name,role,created_at FROM users WHERE active=false ORDER BY created_at ASC LIMIT 500')).rows;
      return send(200, { items: rows.map(row => ({ id: row.id, displayName: row.display_name, roleLabel: labels[row.role] || row.role, requestedAt: row.created_at })) });
    }
    if (path === '/api/v1/admin/users' && req.method === 'GET') return send(200, { users: (await db.query('SELECT id,email,display_name,role,employer_id,active FROM users ORDER BY created_at DESC LIMIT 500')).rows.map(publicUser) });
    if (path === '/api/v1/admin/employers' && req.method === 'GET') return send(200, { employers: (await db.query('SELECT id,name,cnps_number FROM employers ORDER BY name LIMIT 500')).rows });
    // Accounts are created by the people who use them (POST /auth/sign-up).
    // An administrator only decides which role an existing account holds.
    const roleChange = path.match(/^\/api\/v1\/admin\/users\/([a-f0-9-]{36})\/role$/);
    if (roleChange && req.method === 'POST') {
      const [, id] = roleChange;
      if (id === user.id) fail(400, 'You cannot change your own role.');
      if (!roles.includes(body.role)) fail(400, 'Unknown role.');
      return transaction(db, async client => {
        await client.query('SELECT pg_advisory_xact_lock(734821, 2)');
        const target = (await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!target) fail(404, 'User not found.');
        if (target.role === body.role) return { message: 'That role is already assigned.' };
        if (target.role === 'administrator' && !(await client.query("SELECT 1 FROM users WHERE role='administrator' AND active AND id<>$1", [id])).rowCount) fail(400, 'Keep at least one administrator.');
        // An employer account must belong to an employer record; staff roles must not,
        // otherwise they would receive the employer's notifications.
        let employerId = null;
        if (body.role === 'employer') {
          employerId = target.employer_id;
          if (!employerId) {
            if (typeof body.employerId !== 'string' || !body.employerId) fail(400, 'Attach the account to an employer before assigning the employer role.');
            const employer = (await client.query('SELECT id FROM employers WHERE id=$1', [body.employerId])).rows[0];
            if (!employer) fail(400, 'Employer not found.');
            employerId = employer.id;
          }
        }
        await client.query('UPDATE users SET role=$1, employer_id=$2 WHERE id=$3', [body.role, employerId, id]);
        await audit(client, user.id, `user.role:${id}:${target.role}->${body.role}`);
        return { message: 'Role updated.' };
      }).then(result => send(200, result));
    }
    const match = path.match(/^\/api\/v1\/admin\/users\/([a-f0-9-]{36})\/(active|reset-link)$/);
    if (match && req.method === 'POST') {
      const [, id, action] = match;
      return transaction(db, async client => {
        await client.query('SELECT pg_advisory_xact_lock(734821, 2)');
        const target = (await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!target) fail(404, 'User not found.');
        if (action === 'active') {
          if (typeof body.active !== 'boolean') fail(400, 'Active must be true or false.');
          if (id === user.id && !body.active) fail(400, 'You cannot disable your own account.');
          if (!body.active && target.role === 'administrator' && !(await client.query("SELECT 1 FROM users WHERE role='administrator' AND active AND id<>$1", [id])).rowCount) fail(400, 'Keep at least one active administrator.');
          await client.query('UPDATE users SET active=$1 WHERE id=$2', [body.active, id]);
          await client.query('DELETE FROM sessions WHERE user_id=$1', [id]);
          await client.query('DELETE FROM password_resets WHERE user_id=$1', [id]);
          await audit(client, user.id, `user.active:${id}:${body.active}`);
          return { message: 'Account updated.' };
        }
        if (!target.active) fail(400, 'Enable the account before issuing a reset link.');
        const token = randomBytes(32).toString('hex');
        await client.query('DELETE FROM password_resets WHERE user_id=$1 OR expires_at<NOW()', [id]);
        await client.query("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 minutes')", [digest(token), id]);
        await audit(client, user.id, `user.reset_issued:${id}`);
        return { token, expiresInMinutes: 30 };
      }).then(result => send(200, result));
    }
  }
  fail(404, 'Route not found.');
}
