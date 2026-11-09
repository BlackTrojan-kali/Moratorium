// Full stack database test - test database operations through the backend API
import http from 'http';

const API_URL = 'http://localhost:3000';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}${path}`;
    console.log(`🔄 Request: ${options.method || 'GET'} ${url}`);
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ Response: ${res.statusCode}`);
          console.log(`   Data:`, JSON.stringify(parsed, null, 2));
          resolve({ status: res.status, data: parsed });
        } catch (e) {
          resolve({ status: res.status, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error: ${error.message}`);
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testFullStackDatabaseIntegration() {
  console.log('=== Full Stack Database Integration Test ===\n');
  
  try {
    // Test 1: Health check (includes database query)
    console.log('Test 1: Health Check (includes DB query)');
    const health = await makeRequest('/api/v1/health');
    console.log();
    
    // Test 2: Try to access users (should fail without auth)
    console.log('Test 2: Access users without authentication (should fail)');
    try {
      await makeRequest('/api/v1/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5173'
        }
      });
    } catch (error) {
      console.log('✅ Correctly rejected unauthenticated request');
    }
    console.log();
    
    // Test 3: Try to login with invalid credentials
    console.log('Test 3: Login with invalid credentials');
    try {
      const login = await makeRequest('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5173'
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
      });
      if (login.status === 401) {
        console.log('✅ Correctly rejected invalid credentials');
      }
    } catch (error) {
      console.log('⚠️  Login test error:', error.message);
    }
    console.log();
    
    // Test 4: Try to access requests (should fail without auth)
    console.log('Test 4: Access requests without authentication (should fail)');
    try {
      const requests = await makeRequest('/api/v1/requests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5173'
        }
      });
      if (requests.status === 401) {
        console.log('✅ Correctly protected requests endpoint');
      }
    } catch (error) {
      console.log('⚠️  Requests test error:', error.message);
    }
    console.log();
    
    console.log('=== ✅ Full Stack Database Integration: Tests Completed ===');
    console.log('Note: Full authentication testing requires valid user credentials');
    
  } catch (error) {
    console.error('❌ Full stack test failed:', error.message);
    process.exit(1);
  }
}

testFullStackDatabaseIntegration();