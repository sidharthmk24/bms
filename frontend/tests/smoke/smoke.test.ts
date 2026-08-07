import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../helpers/client';
import { loginAs } from '../helpers/auth';
import { getFixtures } from '../helpers/fixtures';

let token: string;
let fixtures: any;

beforeAll(async () => {
  token = await loginAs('SUPER_ADMIN');
  fixtures = await getFixtures();
});

describe('API Smoke Tests', () => {
  describe('GET /audit', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/audit`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/audit`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/audit`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/auth/me`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/auth/me`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/auth/me`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/:action', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/auth/login`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/auth/login`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /billing/checkout', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/billing/checkout`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/billing/checkout`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /billing', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/billing`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/billing`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/billing`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /billing/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/billing/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/billing/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /billing/:id/void', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/billing/${fixtures.billId}/void`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /branches', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/branches`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/branches`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/branches`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /branches', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/branches`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/branches`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/branches`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/branches`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /branches/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/branches/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/branches/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /branches/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/branches/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /catalog/authors', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/catalog/authors`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/catalog/authors`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /catalog/authors', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/catalog/authors`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/catalog/authors`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /catalog/categories', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/catalog/categories`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/catalog/categories`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /catalog/categories', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/catalog/categories`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/catalog/categories`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /catalog/publishers', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/catalog/publishers`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/catalog/publishers`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /catalog/publishers', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/catalog/publishers`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/catalog/publishers`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /catalog/suppliers', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/catalog/suppliers`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /catalog/suppliers', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/catalog/suppliers`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /catalog/:entity', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/catalog/books`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/catalog/books`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /catalog/:entity', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/catalog/books`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/catalog/books`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /catalog/:entity/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/catalog/books/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/catalog/books/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /catalog/:entity/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/catalog/books/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /catalog/:entity/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('DELETE', `/catalog/books/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/admin', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/admin`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/admin`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/branch-front-office', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/branch-front-office`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/branch-inventory', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/branch-inventory`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/branch-manager', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/branch-manager`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/central-inventory', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/central-inventory`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/finance', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/finance`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/finance`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dashboard/super-admin', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/dashboard/super-admin`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /enquiries/demand', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/enquiries/demand`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/enquiries/demand`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /enquiries/new-title', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/enquiries/new-title`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /enquiries/new-title', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/enquiries/new-title`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /enquiries/new-title/:id/review', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/enquiries/new-title/${fixtures.billId}/review`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /enquiries', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/enquiries`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/enquiries`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/enquiries`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /enquiries', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/enquiries`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/enquiries`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/enquiries`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/enquiries`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /enquiries/:id/status', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/enquiries/${fixtures.billId}/status`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /exhibitions', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/exhibitions`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/exhibitions`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /exhibitions', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/exhibitions`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/exhibitions`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /exhibitions/:id/close', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/close`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /exhibitions/:id/dispatch', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/dispatch`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /exhibitions/:id/review', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/exhibitions/${fixtures.billId}/review`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /exhibitions/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/exhibitions/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/exhibitions/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /finance/cash-reconciliations', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/finance/cash-reconciliations`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /finance/cash-reconciliations', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/finance/cash-reconciliations`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /finance/expenses', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/finance/expenses`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/finance/expenses`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /finance/expenses', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/finance/expenses`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/finance/expenses`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /finance/expenses/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/finance/expenses/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /finance/expenses/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('DELETE', `/finance/expenses/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /finance/reports/branch-comparison', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/finance/reports/branch-comparison`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /finance/reports/export', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/finance/reports/export`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/finance/reports/export`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /finance/reports/pnl', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/finance/reports/pnl`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /finance/reports/revenue', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/finance/reports/revenue`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/health`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });
  });

  describe('GET /inventory/branches/:branchId/inventory/low', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory/low`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /inventory/branches/:branchId/inventory', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /inventory/branches/:branchId/inventory', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /inventory/branches/:branchId/inventory/:bookId/adjust', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/adjust`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /inventory/branches/:branchId/inventory/:bookId/threshold', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/inventory/branches/${fixtures.branch1Id}/inventory/${fixtures.bookId}/threshold`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /inventory/central-stock/low', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/inventory/central-stock/low`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /inventory/central-stock', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/inventory/central-stock`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /inventory/central-stock/:bookId/threshold', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/inventory/central-stock/${fixtures.bookId}/threshold`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /inventory/stock-movements', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/inventory/stock-movements`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /notifications/sync', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/notifications/sync`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/notifications/sync`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /procurement', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/procurement`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/procurement`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/procurement`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /procurement', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/procurement`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/procurement`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/procurement`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/procurement`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /procurement/:id/receive', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/procurement/${fixtures.billId}/receive`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /procurement/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/procurement/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/procurement/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /restock', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/restock`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/restock`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/restock`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /restock', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/restock`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/restock`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/restock`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/restock`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /restock/:id/dispatch', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/dispatch`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /restock/:id/receive', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/receive`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /restock/:id/review', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/restock/${fixtures.billId}/review`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /restock/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/restock/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/restock/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /settings', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/settings`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/settings`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/settings`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /settings/:key', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/settings/currency_symbol`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /settings/:key', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/settings/currency_symbol`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /users', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/users`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/users`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/users`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /users', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/users`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/users`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/users`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/users`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /users/:id/reset-password', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('POST', `/users/${fixtures.billId}/reset-password`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for non-existent ID', async () => {
      const fakePath = `/users/${fixtures.billId}`.replace(/([0-9a-fA-F-]{36})|(\d+)/, '00000000-0000-0000-0000-000000000000');
      const res = await apiClient('GET', fakePath, { token });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('GET', `/users/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('should respond and not return 500', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token });
      expect(res.status).not.toBe(500);
      // expect valid envelope
      if (res.status >= 200 && res.status < 300) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
      } else if (res.status >= 400 && res.status < 500) {
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 for empty body', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token, body: {} });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await apiClient('PATCH', `/users/${fixtures.billId}/status`, { token: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });
  });

});
