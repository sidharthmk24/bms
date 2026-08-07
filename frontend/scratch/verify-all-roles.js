const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
const PASS = 'Password@123';

const users = [
  { email: 'superadmin@bms.com', role: 'SUPER_ADMIN' },
  { email: 'admin@bms.com', role: 'ADMIN' },
  { email: 'finance@bms.com', role: 'FINANCE' },
  { email: 'inventory@bms.com', role: 'CENTRAL_INVENTORY_MANAGER' },
  { email: 'manager.br01@bms.com', role: 'BRANCH_MANAGER' },
  { email: 'stock.br01@bms.com', role: 'BRANCH_INVENTORY' },
  { email: 'counter.br01@bms.com', role: 'BRANCH_FRONT_OFFICE' }
];

async function run() {
  for (const u of users) {
    try {
      console.log(`\n--- Testing Role: ${u.role} (${u.email}) ---`);
      
      // 1. Login
      const loginRes = await axios.post(`${API_URL}/auth/login`, { email: u.email, password: PASS });
      const token = loginRes.data.data.accessToken;
      console.log('✅ Login successful');
      
      const api = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. Fetch Dashboard
      let dashEndpoint = '/dashboard';
      if (u.role === 'SUPER_ADMIN') dashEndpoint = '/dashboard/super-admin';
      else if (u.role === 'ADMIN') dashEndpoint = '/dashboard/admin';
      else if (u.role === 'FINANCE') dashEndpoint = '/dashboard/finance';
      else if (u.role === 'CENTRAL_INVENTORY_MANAGER') dashEndpoint = '/dashboard/central-inventory';
      else if (u.role === 'BRANCH_MANAGER') dashEndpoint = '/dashboard/branch-manager';
      else if (u.role === 'BRANCH_INVENTORY') dashEndpoint = '/dashboard/branch-inventory';
      else if (u.role === 'BRANCH_FRONT_OFFICE') dashEndpoint = '/dashboard/branch-front-office';
      
      await api.get(dashEndpoint);
      console.log(`✅ Dashboard loaded: ${dashEndpoint}`);
      
      // 3. Dummy Data Test based on Role
      if (u.role === 'SUPER_ADMIN') {
        const branches = await api.get('/branches');
        console.log(`✅ Fetched ${branches.data.data?.length || branches.data.data?.items?.length} branches`);
      } else if (u.role === 'CENTRAL_INVENTORY_MANAGER') {
        const catalog = await api.get('/catalog/books');
        console.log(`✅ Fetched ${catalog.data.data?.length || catalog.data.data?.items?.length} books`);
      } else if (u.role === 'BRANCH_MANAGER') {
        const users = await api.get('/users');
        console.log(`✅ Fetched ${users.data.data?.length || users.data.data?.items?.length} branch staff`);
      } else if (u.role === 'BRANCH_FRONT_OFFICE') {
        const enquiries = await api.get('/enquiries');
        console.log(`✅ Fetched ${enquiries.data.data?.length || enquiries.data.data?.items?.length} enquiries`);
      } else if (u.role === 'BRANCH_INVENTORY') {
        const restock = await api.get('/restock');
        console.log(`✅ Fetched ${restock.data.data?.length || restock.data.data?.items?.length} restock requests`);
      }
      
    } catch (err) {
      console.error(`❌ Error for ${u.role}:`, err.response?.status, err.response?.data || err.message);
    }
  }
}

run();
