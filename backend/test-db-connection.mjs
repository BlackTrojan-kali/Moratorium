// Database connection test script
import pg from 'pg';

async function testDatabaseConnection() {
  console.log('=== Database Connection Test ===\n');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.log('Please ensure .env file exists with DATABASE_URL configured');
    process.exit(1);
  }
  
  console.log('Connection String (masked):');
  const masked = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log(masked);
  console.log();
  
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5000
  });
  
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL\n');
    
    // Test basic query
    console.log('🔄 Testing basic query...');
    const result = await client.query('SELECT version()');
    console.log('✅ Query successful');
    console.log('PostgreSQL version:', result.rows[0].version);
    console.log();
    
    // Test database info
    console.log('🔄 Getting database information...');
    const dbInfo = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()');
    console.log('✅ Database info retrieved:');
    console.log('  Database:', dbInfo.rows[0].current_database);
    console.log('  User:', dbInfo.rows[0].current_user);
    console.log('  Server:', dbInfo.rows[0].inet_server_addr);
    console.log('  Port:', dbInfo.rows[0].inet_server_port);
    console.log();
    
    // Test table existence
    console.log('🔄 Checking for required tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('✅ Tables found:', tables.rows.length);
    tables.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    console.log();
    
    // Test users table
    console.log('🔄 Testing users table...');
    try {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log('✅ Users table accessible');
      console.log('  Total users:', userCount.rows[0].count);
    } catch (error) {
      console.log('⚠️  Users table query failed:', error.message);
    }
    console.log();
    
    // Test employers table
    console.log('🔄 Testing employers table...');
    try {
      const employerCount = await client.query('SELECT COUNT(*) as count FROM employers');
      console.log('✅ Employers table accessible');
      console.log('  Total employers:', employerCount.rows[0].count);
    } catch (error) {
      console.log('⚠️  Employers table query failed:', error.message);
    }
    console.log();
    
    // Test requests table
    console.log('🔄 Testing moratorium_requests table...');
    try {
      const requestCount = await client.query('SELECT COUNT(*) as count FROM moratorium_requests');
      console.log('✅ Moratorium requests table accessible');
      console.log('  Total requests:', requestCount.rows[0].count);
    } catch (error) {
      console.log('⚠️  Moratorium requests table query failed:', error.message);
    }
    console.log();
    
    // Test connection pool performance
    console.log('🔄 Testing connection pool performance...');
    const pool = new pg.Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    });
    
    const startTime = Date.now();
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(pool.query('SELECT pg_sleep(0.1), $1 as iteration', [i]));
    }
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log('✅ Pool test completed');
    console.log('  5 concurrent queries with 0.1s sleep each:', duration + 'ms');
    console.log('  Average per query:', Math.round(duration / 5) + 'ms');
    
    await pool.end();
    console.log();
    
    console.log('=== ✅ All Database Tests Passed ===');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testDatabaseConnection();