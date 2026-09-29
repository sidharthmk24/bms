import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { AuthService } from '../lib/services/auth.service';

async function testVerifyEmail() {
  const authService = new AuthService();
  try {
    console.log('Testing verifyEmail with admin@kairalibooks.com...');
    const result = await authService.verifyEmail('admin@kairalibooks.com');
    console.log('Result:', result);
  } catch (err: any) {
    console.error('Error during verifyEmail:', err);
  }
}

testVerifyEmail();
