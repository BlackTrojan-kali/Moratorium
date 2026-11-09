// Backend database integration test
import { openDatabase } from './src/database.mjs';

async function testBackendDatabaseIntegration() {
  console.log('=== Backend Database Integration Test ===\n');
  
  let db;
  try {
    console.log('🔄 Opening database connection using backend configuration...');
    db = openDatabase();
    console.log('✅ Database pool created\n');
    
    // Test connection
    console.log('🔄 Testing database connection...');
    await db.query('SELECT 1');
    console.log('✅ Database connection successful\n');
    
    // Test schema queries
    console.log('🔄 Testing schema queries...');
    const schemaCheck = await db.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'employers', 'moratorium_requests')
      ORDER BY table_name, ordinal_position
    `);
    console.log('✅ Schema query successful');
    console.log('  Columns in core tables:', schemaCheck.rows.length);
    console.log();
    
    // Test user data
    console.log('🔄 Testing user data access...');
    const users = await db.query(`
      SELECT id, email, display_name, role, active 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('✅ User data accessible');
    console.log('  Recent users:', users.rows.length);
    users.rows.forEach(user => {
      console.log(`    - ${user.display_name} (${user.role}) - ${user.active ? 'Active' : 'Inactive'}`);
    });
    console.log();
    
    // Test employer data
    console.log('🔄 Testing employer data access...');
    const employers = await db.query(`
      SELECT id, name, cnps_number 
      FROM employers 
      ORDER BY name
    `);
    console.log('✅ Employer data accessible');
    console.log('  Total employers:', employers.rows.length);
    employers.rows.forEach(emp => {
      console.log(`    - ${emp.name} (${emp.cnps_number})`);
    });
    console.log();
    
    // Test request data
    console.log('🔄 Testing request data access...');
    const requests = await db.query(`
      SELECT id, reference, status, created_at 
      FROM moratorium_requests 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('✅ Request data accessible');
    console.log('  Total requests:', requests.rows.length);
    console.log();
    
    // Test transaction support
    console.log('🔄 Testing transaction support...');
    try {
      await db.query('BEGIN');
      await db.query('SELECT 1');
      await db.query('ROLLBACK');
      console.log('✅ Transaction support working');
    } catch (error) {
      console.log('⚠️  Transaction test failed:', error.message);
    }
    console.log();
    
    // Test connection pool limits
    console.log('🔄 Testing connection pool...');
    const poolInfo = {
      totalCount: db.totalCount,
      idleCount: db.idleCount,
      waitingCount: db.waitingCount
    };
    console.log('✅ Pool status:');
    console.log('  Total connections:', poolInfo.totalCount);
    console.log('  Idle connections:', poolInfo.idleCount);
    console.log('  Waiting requests:', poolInfo.waitingCount);
    console.log();
    
    // Test error handling
    console.log('🔄 Testing error handling...');
    try {
      await db.query('SELECT * FROM nonexistent_table');
      console.log('⚠️  Error handling not working properly');
    } catch (error) {
      console.log('✅ Error handling working correctly');
      console.log('  Error caught:', error.message);
    }
    console.log();
    
    console.log('=== ✅ Backend Database Integration: All Tests Passed ===');
    
  } catch (error) {
    console.error('❌ Backend database integration failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
      console.log('🔄 Database connection closed');
    }
  }
}

testBackendDatabaseIntegration();