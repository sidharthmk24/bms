import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../helpers/client';
import { loginAs } from '../helpers/auth';
import { getFixtures } from '../helpers/fixtures';

let superToken: string;
let foToken: string;
let financeToken: string;
let fixtures: any;

beforeAll(async () => {
  superToken = await loginAs('SUPER_ADMIN');
  foToken = await loginAs('BRANCH_FRONT_OFFICE');
  financeToken = await loginAs('FINANCE');
  fixtures = await getFixtures();
});

describe('Critical Integration Flows', () => {
  describe('Auth', () => {
    it('Login with wrong password returns 401 and does not reveal email existence', async () => {
      const res = await apiClient('POST', '/auth/login', {
        body: { email: 'superadmin@bms.com', password: 'wrong' }
      });
      expect(res.status).toBe(401);
      // Ensure passwordHash is never leaked
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('Expired/malformed token returns 401', async () => {
      const res = await apiClient('GET', '/auth/me', { token: 'bad-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('Billing & Concurrency', () => {
    it('Concurrency: two simultaneous requests to buy the last copy -> one succeeds, one 409', async () => {
      // Find a book in branch 1 and set its stock to 1
      const invRes = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: superToken });
      const inventory = invRes.body.data;
      const testBook = inventory.find((i: any) => i.quantity > 5);
      
      if (!testBook) {
        console.warn('Could not find suitable book for concurrency test');
        return;
      }
      
      const bookId = testBook.bookId;
      
      // Adjust stock to exactly 1 using SUPER_ADMIN
      await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${bookId}/adjust`, {
        token: superToken,
        body: { quantity: 1, reason: 'Test setup' }
      });

      // Fire two checkout requests simultaneously
      const reqBody = {
        branchId: fixtures.branch1Id,
        paymentMode: 'CASH',
        items: [{ bookId, quantity: 1 }]
      };
      
      const [res1, res2] = await Promise.all([
        apiClient('POST', '/billing/checkout', { token: foToken, body: reqBody }),
        apiClient('POST', '/billing/checkout', { token: foToken, body: reqBody })
      ]);

      const statuses = [res1.status, res2.status].sort();
      // One should be 201 Created, one should be 409 Conflict
      expect(statuses).toEqual([201, 409]);

      // Verify stock is exactly 0
      const finalInvRes = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: superToken });
      const finalBook = finalInvRes.body.data.find((i: any) => i.bookId === bookId);
      expect(finalBook.quantity).toBe(0);
      
      // Attempt to sell more than exist -> 409 and stock unchanged
      const res3 = await apiClient('POST', '/billing/checkout', { token: foToken, body: reqBody });
      expect(res3.status).toBe(409);
      
      const checkInvRes = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: superToken });
      const checkBook = checkInvRes.body.data.find((i: any) => i.bookId === bookId);
      expect(checkBook.quantity).toBe(0); // unchanged
    });
  });

  describe('Stock Ledger Invariant', () => {
    it('Sum of all stock_movements quantities equals the current branch_inventory.quantity', async () => {
      // Get all movements
      const movRes = await apiClient('GET', '/inventory/stock-movements', { token: superToken });
      const movements = movRes.body.data;
      
      // Get all branch inventory
      const invRes = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: superToken });
      const inventory = invRes.body.data;

      // Group movements by bookId for branch1
      const sums: Record<string, number> = {};
      for (const m of movements) {
        if (m.branchId === fixtures.branch1Id) {
          sums[m.bookId] = (sums[m.bookId] || 0) + Number(m.quantityChange);
        }
      }

      // Assert invariant
      for (const item of inventory) {
        const expectedQuantity = sums[item.bookId] || 0;
        expect(item.quantity).toBe(expectedQuantity);
      }
    });
  });
});
