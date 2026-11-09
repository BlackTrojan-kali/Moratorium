import { openDatabase } from './database.mjs';
import { createUser } from './auth.mjs';
// Input is passed through stdin by the PowerShell wrapper, never command arguments.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const details = JSON.parse(input);
const db = openDatabase();
try {
 const user = await createUser(db, { ...details, role: 'administrator' }, null, true);
 console.log(`Administrator created: ${user.email}`);
} catch (error) { console.error(error.status ? error.message : 'Administrator creation failed. Check database connectivity and duplicate email.'); process.exitCode = 1; }
finally { await db.end(); }
