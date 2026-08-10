import { AuthService } from './lib/services/auth.service';

async function test() {
  const authService = new AuthService();
  try {
    const result = await authService.verifyEmail('superadmin@bms.com');
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
