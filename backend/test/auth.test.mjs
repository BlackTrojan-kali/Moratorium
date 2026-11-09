import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import pg from 'pg';
import { migrate } from '../src/migrations.mjs';
import { createUser, digest, roles } from '../src/auth.mjs';
import { createApp } from '../src/app.mjs';

test('all actors: authentication, authorization, reset, revocation and throttling', {skip: !process.env.TEST_DATABASE_URL}, async () => {
  const root = new pg.Pool({connectionString: process.env.TEST_DATABASE_URL});
  const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;
  let db, server;
  try {
    await root.query(`CREATE SCHEMA "${schema}"`);
    db = new pg.Pool({connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}`});
    await migrate(db);
    const password = 'Test-password-123!';
    const admin = await createUser(db, {email:'admin@example.test', displayName:'Admin', role:'administrator', password}, null, true);
    await assert.rejects(createUser(db, {email:'other@example.test', displayName:'Other', role:'administrator', password}, null, true), {status:409});
    const storedAdmin = (await db.query('SELECT password_hash FROM users WHERE id=$1',[admin.id])).rows[0];
    assert.notEqual(storedAdmin.password_hash,password); assert.match(storedAdmin.password_hash,/^scrypt\$/);
    server = createApp({db, logger:{error() {}}, secureCookies:true});
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    async function call(path, body, cookie = '', origin = 'http://localhost:5173') {
      const response = await fetch(base+path, {method: body === undefined ? 'GET':'POST', headers:{Origin:origin, Cookie:cookie, 'Content-Type':'application/json'}, body: body === undefined ? undefined:JSON.stringify(body)});
      return {status:response.status, data:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0] || '', headers:response.headers};
    }
    assert.equal((await call('/auth/me')).status,401);
    assert.equal((await call('/auth/login',{email:'admin@example.test',password}, '', 'https://evil.test')).status,403);
    assert.equal((await call('/auth/login',{email:'admin@example.test',password:'wrong'})).status,401);
    const login = await call('/auth/login',{email:'ADMIN@example.test',password});
    assert.equal(login.status,200); assert.match(login.headers.get('set-cookie'), /HttpOnly/); assert.match(login.headers.get('set-cookie'), /; Secure/);
    assert.equal(login.data.user.password_hash, undefined);
    const adminCookie = login.cookie;
    assert.equal((await call('/admin/users',undefined,adminCookie)).status,200);
    for (const role of roles.filter(r => r !== 'administrator')) {
      // Accounts create themselves through sign-up; the suite seeds them directly.
      const created = await createUser(db, {email:`${role}@example.test`,displayName:role,role,password});
      const signed = await call('/auth/login',{email:`${role}@example.test`,password});
      assert.equal(signed.status,200); assert.equal(signed.data.user.role,role);
      assert.equal((await call('/auth/me',undefined,signed.cookie)).data.user.role,role);
      assert.equal((await call('/admin/users',undefined,signed.cookie)).status,403);
      assert.equal((await call('/admin/users',{role:'administrator'},signed.cookie)).status,403);
      const tokenHash = digest(signed.cookie.split('=')[1]);
      assert.equal((await db.query('SELECT token_hash FROM sessions WHERE token_hash=$1',[tokenHash])).rowCount,1);
      if (role === 'employer') {
        assert.ok(created.employerId);
        const issued = await call(`/admin/users/${created.id}/reset-link`,{},adminCookie);
        assert.equal(issued.status,200);
        const reset = await call('/auth/reset-password',{token:issued.data.token,password:'Replacement-pass-123!'});
        assert.equal(reset.status,200);
        assert.equal((await call('/auth/reset-password',{token:issued.data.token,password:'Replacement-pass-123!'})).status,400);
        assert.equal((await call('/auth/me',undefined,signed.cookie)).status,401);
        assert.equal((await call('/auth/login',{email:`${role}@example.test`,password})).status,401);
        assert.equal((await call('/auth/login',{email:`${role}@example.test`,password:'Replacement-pass-123!'})).status,200);
      } else if (role === 'agent_dt') {
        assert.equal((await call(`/admin/users/${created.id}/active`,{active:false},adminCookie)).status,200);
        assert.equal((await call('/auth/me',undefined,signed.cookie)).status,401);
        assert.equal((await call('/auth/login',{email:`${role}@example.test`,password})).status,401);
      } else if (role === 'ce_cea') {
        assert.equal((await call('/auth/change-password',{currentPassword:'wrong',password:'New-password-123!'},signed.cookie)).status,400);
        assert.equal((await call('/auth/change-password',{currentPassword:password,password:'New-password-123!'},signed.cookie)).status,200);
        assert.equal((await call('/auth/me',undefined,signed.cookie)).status,401);
      } else {
        await call('/auth/logout',{},signed.cookie);
        assert.equal((await call('/auth/me',undefined,signed.cookie)).status,401);
      }
    }
    assert.equal((await call(`/admin/users/${admin.id}/active`,{active:false},adminCookie)).status,400);
    const expired = await call(`/admin/users/${admin.id}/reset-link`,{},adminCookie);
    await db.query('UPDATE password_resets SET expires_at=NOW()-INTERVAL \'1 second\'');
    assert.equal((await call('/auth/reset-password',{token:expired.data.token,password:'Replacement-pass-123!'})).status,400);
    for(let i=0;i<10;i++) assert.equal((await call('/auth/login',{email:'missing@example.test',password:'incorrect'})).status,401);
    assert.equal((await call('/auth/login',{email:'missing@example.test',password:'incorrect'})).status,429);
    await db.query('UPDATE sessions SET expires_at=NOW()-INTERVAL \'1 second\' WHERE user_id=$1',[admin.id]);
    assert.equal((await call('/auth/me',undefined,adminCookie)).status,401);
    assert.ok((await db.query('SELECT * FROM audit_events')).rowCount>10);
  } finally {
    if(server?.listening) await new Promise(resolve=>server.close(resolve));
    await db?.end(); await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.end();
  }
});
