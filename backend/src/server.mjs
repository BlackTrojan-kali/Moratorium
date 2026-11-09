import { openDatabase } from './database.mjs';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
const db = openDatabase();
try {
  await db.query('SELECT 1');
} catch (error) {
  await db.end();
  throw error;
}
const server = createApp({ db, corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173' });
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.on('error', async (error) => { console.error(error); await db.end(); process.exitCode = 1; });
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Moratorium API listening on port ${port}`));
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => { server.closeAllConnections(); }, 5000);
  deadline.unref();
  server.close(async () => { clearTimeout(deadline); await db.end(); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
