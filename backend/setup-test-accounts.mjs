import { openDatabase } from './src/database.mjs';
import { createUser } from './src/auth.mjs';

const db = openDatabase();
const password = process.env.ACCOUNT_PASSWORD || 'Morapay2026!';

async function setupAccounts() {
  try {
    // 1. Admin
    const adminCheck = await db.query("SELECT id FROM users WHERE role='administrator'");
    let adminId = adminCheck.rows[0]?.id;
    if (!adminId) {
      console.log('Creating admin account...');
      const admin = await createUser(db, {
        email: 'admin@cnps.cm',
        displayName: 'Administrateur CNPS',
        password: password,
        role: 'administrator'
      }, null, true);
      adminId = admin.id;
      console.log('Admin created: admin@cnps.cm');
    }

    // 2. Employeur (Employer)
    const employerCheck = await db.query("SELECT id FROM users WHERE email='employeur@cnps.cm'");
    if (employerCheck.rows.length === 0) {
      console.log('Creating employer account...');
      await createUser(db, {
        email: 'employeur@cnps.cm',
        displayName: 'Employeur CNPS Test',
        password: password,
        role: 'employer',
        employerName: 'ENTREPRISE CAMEROUN TEST SARL',
        cnpsNumber: 'CNPS-987654321'
      }, adminId);
      console.log('Employer created: employeur@cnps.cm');
    }

    // 3. Agent (DT)
    const agentCheck = await db.query("SELECT id FROM users WHERE email='agent@cnps.cm'");
    if (agentCheck.rows.length === 0) {
      console.log('Creating agent account...');
      await createUser(db, {
        email: 'agent@cnps.cm',
        displayName: 'Agent CNPS (DT)',
        password: password,
        role: 'agent_dt'
      }, adminId);
      console.log('Agent created: agent@cnps.cm');
    }

    console.log('====================================================');
    console.log('Comptes de test crees avec succes !');
    console.log('Mot de passe pour tous les comptes : Morapay2026!');
    console.log('1. Employeur  : employeur@cnps.cm');
    console.log('2. Agent (DT) : agent@cnps.cm');
    console.log('3. Admin      : admin@cnps.cm');
    console.log('====================================================');
  } catch (err) {
    console.error('Erreur lors de la creation des comptes :', err);
  } finally {
    await db.end();
  }
}

setupAccounts();
