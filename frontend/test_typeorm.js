const { getDataSource } = require('./lib/db/data-source');
const { AuthService } = require('./lib/services/auth.service');

async function run() {
  try {
    const authService = new AuthService();
    const result = await authService.verifyEmail('superadmin@bms.com');
    console.log('Result:', result);
    
    // Clean up
    const ds = await getDataSource();
    await ds.destroy();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
