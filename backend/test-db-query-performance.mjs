// Database query performance test
import { openDatabase } from './src/database.mjs';

async function testDatabaseQueryPerformance() {
  console.log('=== Database Query Performance Test ===\n');
  
  let db;
  try {
    db = openDatabase();
    console.log('✅ Database connected\n');
    
    // Test simple query performance
    console.log('🔄 Testing simple query performance...');
    const start1 = Date.now();
    await db.query('SELECT 1');
    const duration1 = Date.now() - start1;
    console.log(`✅ Simple query: ${duration1}ms\n`);
    
    // Test complex query performance
    console.log('🔄 Testing complex query performance...');
    const start2 = Date.now();
    await db.query(`
      SELECT u.id, u.email, u.display_name, u.role, 
             COUNT(DISTINCT r.id) as request_count
      FROM users u
      LEFT JOIN moratorium_requests r ON u.id = r.created_by
      GROUP BY u.id, u.email, u.display_name, u.role
      ORDER BY request_count DESC
    `);
    const duration2 = Date.now() - start2;
    console.log(`✅ Complex query: ${duration2}ms\n`);
    
    // Test write performance
    console.log('🔄 Testing write performance...');
    const start3 = Date.now();
    await db.query('BEGIN');
    await db.query('SELECT 1');
    await db.query('ROLLBACK');
    const duration3 = Date.now() - start3;
    console.log(`✅ Transaction (BEGIN/SELECT/ROLLBACK): ${duration3}ms\n`);
    
    // Test connection pool under load
    console.log('🔄 Testing connection pool under load...');
    const start4 = Date.now();
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(db.query('SELECT pg_sleep(0.01), $1 as iteration', [i]));
    }
    await Promise.all(promises);
    const duration4 = Date.now() - start4;
    console.log(`✅ 20 concurrent queries: ${duration4}ms`);
    console.log(`   Average per query: ${Math.round(duration4 / 20)}ms\n`);
    
    // Test index usage
    console.log('🔄 Testing index usage...');
    const start5 = Date.now();
    await db.query(`
      SELECT * FROM users 
      WHERE email = 'nonexistent@example.com'
    `);
    const duration5 = Date.now() - start5;
    console.log(`✅ Indexed query (users.email): ${duration5}ms\n`);
    
    // Test join performance
    console.log('🔄 Testing join performance...');
    const start6 = Date.now();
    await db.query(`
      SELECT r.*, e.name as employer_name
      FROM moratorium_requests r
      JOIN employers e ON e.id = r.employer_id
      LIMIT 10
    `);
    const duration6 = Date.now() - start6;
    console.log(`✅ Join query: ${duration6}ms\n`);
    
    console.log('=== ✅ Database Performance Tests Completed ===');
    console.log('Performance Summary:');
    console.log(`  Simple query: ${duration1}ms`);
    console.log(`  Complex query: ${duration2}ms`);
    console.log(`  Transaction: ${duration3}ms`);
    console.log(`  20 concurrent: ${duration4}ms`);
    console.log(`  Indexed query: ${duration5}ms`);
    console.log(`  Join query: ${duration6}ms`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

testDatabaseQueryPerformance();