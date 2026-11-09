import pg from 'pg';

export function openDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Set DATABASE_URL to your PostgreSQL connection string');
  const db = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
  db.on('error', (error) => console.error('PostgreSQL idle connection error', { code: error.code }));
  return db;
}
