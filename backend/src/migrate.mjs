import { openDatabase } from './database.mjs';
import { migrate } from './migrations.mjs';

const db = openDatabase();
try {
  await migrate(db);
  console.log('PostgreSQL migrations applied');
} finally {
  await db.end();
}
