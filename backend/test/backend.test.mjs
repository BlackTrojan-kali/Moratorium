import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { openDatabase } from '../src/database.mjs';
import { migrate, migrationFiles } from '../src/migrations.mjs';
import { createApp } from '../src/app.mjs';

test('database URL is required', () => {
  assert.throws(() => openDatabase(''), /DATABASE_URL/);
});

test('HTTP health awaits PostgreSQL and handles query failures', async () => {
  let fail = false;
  const db = { async query(sql) { assert.equal(sql, 'SELECT 1'); if (fail) throw new Error('private detail'); return { rows: [] }; } };
  const server = createApp({ db, logger: { error() {} } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/v1`;
  try {
    const healthy = await fetch(`${url}/health`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(healthy.status, 200);
    assert.equal(healthy.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.deepEqual(await healthy.json(), { status: 'ok', service: 'moratorium-api' });
    const untrusted = await fetch(`${url}/health`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
    assert.equal((await fetch(`${url}/requests`)).status, 401);
    assert.equal((await fetch(`${url}/health`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${url}/health`, { method: 'OPTIONS' })).status, 204);
    fail = true;
    const failed = await fetch(`${url}/health`);
    assert.equal(failed.status, 503);
    const body = await failed.json();
    assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(body.error.requestId, failed.headers.get('x-request-id'));
    assert.equal(body.error.message, 'Service unavailable');
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('PostgreSQL migrations, rollback, persistence and constraints', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const admin = openDatabase(process.env.TEST_DATABASE_URL);
  const schema = `backend_test_${randomUUID().replaceAll('-', '')}`;
  let db;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}`, max: 2 });
    // A conflicting table must roll back the entire migration.
    await db.query('CREATE TABLE users (id TEXT)');
    await assert.rejects(migrate(db), { code: '42P07' });
    assert.equal((await db.query("SELECT to_regclass('employers') AS name")).rows[0].name, null);
    assert.equal((await db.query("SELECT to_regclass('schema_migrations') AS name")).rows[0].name, null);
    await db.query('DROP TABLE users');
    await Promise.all([migrate(db), migrate(db)]);
    await db.query("INSERT INTO employers(id,cnps_number,name) VALUES ('e1','CNPS-1','Test employer')");
    await migrate(db);
    assert.equal((await db.query('SELECT count(*) FROM schema_migrations')).rows[0].count, String(migrationFiles.length));
    assert.equal((await db.query('SELECT name FROM employers')).rows[0].name, 'Test employer');
    const insertUser = 'INSERT INTO users(id,email,display_name,password_hash,role,employer_id) VALUES ($1,$2,$3,$4,$5,$6)';
    await assert.rejects(db.query(insertUser, ['bad','bad@example.test','Test','placeholder','root',null]), { code: '23514' });
    await assert.rejects(db.query(insertUser, ['bad','bad@example.test','Test','placeholder','employer',null]), { code: '23514' });
    await db.query(insertUser, ['u1','user@example.test','Test','placeholder','employer','e1']);
    await assert.rejects(db.query(insertUser, ['u2','USER@example.test','Test','placeholder','employer','e1']), { code: '23505' });
    const insertRequest = 'INSERT INTO moratorium_requests(id,reference,employer_id,created_by,debt_amount_xaf) VALUES ($1,$2,$3,$4,$5)';
    await assert.rejects(db.query(insertRequest, ['r1','R1','missing','u1',100]), { code: '23503' });
    await assert.rejects(db.query(insertRequest, ['r1','R1','e1','u1',-100]), { code: '23514' });
    await assert.rejects(db.query(insertRequest, ['r1','R1','e1','u1','1.5']), { code: '22P02' });
    await db.query(insertRequest, ['r1','R1','e1','u1','5000000000']);
    const row = (await db.query('SELECT status,debt_amount_xaf,created_at FROM moratorium_requests')).rows[0];
    assert.equal(row.status, 'Draft');
    assert.equal(row.debt_amount_xaf, '5000000000');
    assert.ok(row.created_at instanceof Date);
    await db.end();
    db = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
    assert.equal((await db.query('SELECT count(*) FROM employers')).rows[0].count, '1');
  } finally {
    await db?.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});


