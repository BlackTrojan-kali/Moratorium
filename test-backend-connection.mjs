// Backend connection test script
import http from 'http';

const API_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

function testConnection(description, url, options = {}) {
  return new Promise((resolve) => {
    console.log(`Testing: ${description}`);
    console.log(`URL: ${url}`);
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
        console.log(`Response: ${data}`);
        console.log('---');
        resolve({ success: true, status: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', (error) => {
      console.error(`Error: ${error.message}`);
      console.log('---');
      resolve({ success: false, error: error.message });
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('=== Frontend-Backend Connection Tests ===\n');

  // Test 1: Backend Health
  await testConnection('Backend Health Check', `${API_URL}/api/v1/health`);

  // Test 2: CORS Preflight
  await testConnection('CORS Preflight (OPTIONS)', `${API_URL}/api/v1/auth/login`, {
    method: 'OPTIONS',
    headers: {
      'Origin': FRONTEND_URL,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });

  // Test 3: Invalid Login
  await testConnection('Invalid Login Attempt', `${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': FRONTEND_URL
    },
    body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' })
  });

  // Test 4: Protected Endpoint (No Auth)
  await testConnection('Protected Endpoint (No Auth)', `${API_URL}/api/v1/requests`, {
    method: 'GET',
    headers: {
      'Origin': FRONTEND_URL
    }
  });

  console.log('=== Tests Complete ===');
}

runTests().catch(console.error);