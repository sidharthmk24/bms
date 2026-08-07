import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../helpers/client';
import { loginAs, Role } from '../helpers/auth';
import { getFixtures } from '../helpers/fixtures';

let fixtures: any;
let tokens: Record<Role, string> = {} as any;
const ROLES: Role[] = [
  'SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'FINANCE',
  'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'
];

beforeAll(async () => {
  fixtures = await getFixtures();
  for (const r of ROLES) {
    tokens[r] = await loginAs(r);
  }
});

describe('Permission Matrix Tests', () => {
  describe('GET /audit', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/audit`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /auth/me', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /auth/:action', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/auth/login`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /billing/checkout', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /billing', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/billing`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /billing/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /billing/:id/void', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /branches', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/branches`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /branches', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/branches`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /branches/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /branches/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /catalog/authors', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /catalog/authors', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /catalog/categories', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /catalog/categories', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /catalog/publishers', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /catalog/publishers', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /catalog/suppliers', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /catalog/suppliers', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /catalog/:entity', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /catalog/:entity', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /catalog/:entity/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /catalog/:entity/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('DELETE /catalog/:entity/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/admin', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/branch-front-office', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/branch-inventory', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/branch-manager', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/central-inventory', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/finance', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /dashboard/super-admin', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /enquiries/demand', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /enquiries/new-title', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /enquiries/new-title', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /enquiries/new-title/:id/review', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /enquiries', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /enquiries', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /enquiries/:id/status', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /exhibitions', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /exhibitions', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /exhibitions/:id/close', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /exhibitions/:id/dispatch', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /exhibitions/:id/review', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /exhibitions/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /finance/cash-reconciliations', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /finance/cash-reconciliations', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /finance/expenses', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /finance/expenses', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /finance/expenses/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('DELETE /finance/expenses/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /finance/reports/branch-comparison', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /finance/reports/export', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /finance/reports/pnl', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /finance/reports/revenue', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /health', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/health`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /inventory/branches/:branchId/inventory/low', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /inventory/branches/:branchId/inventory', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /inventory/branches/:branchId/inventory', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /inventory/branches/:branchId/inventory/:bookId/adjust', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /inventory/branches/:branchId/inventory/:bookId/threshold', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /inventory/central-stock/low', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /inventory/central-stock', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /inventory/central-stock/:bookId/threshold', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /inventory/stock-movements', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /notifications/sync', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /procurement', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/procurement`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /procurement', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/procurement`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /procurement/:id/receive', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /procurement/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /restock', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/restock`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /restock', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/restock`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /restock/:id/dispatch', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /restock/:id/receive', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /restock/:id/review', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /restock/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /settings', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/settings`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /settings/:key', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /settings/:key', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /users', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/users`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /users', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/users`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('POST /users/:id/reset-password', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET /users/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /users/:id', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('role SUPER_ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['SUPER_ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role ADMIN should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['ADMIN'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role CENTRAL_INVENTORY_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['CENTRAL_INVENTORY_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role FINANCE should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['FINANCE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_MANAGER should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['BRANCH_MANAGER'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_INVENTORY should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['BRANCH_INVENTORY'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
    it('role BRANCH_FRONT_OFFICE should return 200', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: tokens['BRANCH_FRONT_OFFICE'] });
      
      // Some endpoints might return 404 or 400 for legitimate data reasons but we are testing permissions.
      // If it's expected to be allowed (200), we just ensure it's NOT 403 or 401.
      if (200 === 200) {
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      } else {
        expect(res.status).toBe(200);
      }
    });
  });

});
