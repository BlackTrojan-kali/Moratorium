// Quick test of the actual API client integration
import { api } from './src/app/api';

async function testApiIntegration() {
  console.log('Testing API integration...');
  
  try {
    // Test health endpoint
    const health = await api<{status: string; service: string}>('/health');
    console.log('Health check:', health);
    
    // Test invalid login
    try {
      await api('/auth/login', { email: 'test@test.com', password: 'wrong' });
    } catch (error) {
      console.log('Invalid login correctly rejected:', error);
    }
    
    // Test protected endpoint
    try {
      await api('/requests');
    } catch (error) {
      console.log('Protected endpoint correctly requires auth:', error);
    }
    
    console.log('API integration test complete');
  } catch (error) {
    console.error('API integration test failed:', error);
  }
}

testApiIntegration();