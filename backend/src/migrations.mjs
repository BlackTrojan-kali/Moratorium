import { readFile } from 'node:fs/promises';

/** Ordered migrations. Add new files at the end; applied versions are recorded in schema_migrations. */
export const migrationFiles = [[1, '001_initial.sql'], [2, '002_auth.sql'], [3, '003_requests.sql'], [4, '004_deposits.sql'], [5, '005_actor_features.sql'], [7, '007_optional_employer_cnps.sql'], [8, '008_purge_legacy_actors.sql'], [9, '009_stage_decisions.sql']];

export async function migrate(db) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(734821, 1)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    for (const [version, file] of migrationFiles) {
    const applied = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);
    if (!applied.rowCount) {
      await client.query(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
    }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
