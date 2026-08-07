import { apiClient } from './client';

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CENTRAL_INVENTORY_MANAGER'
  | 'FINANCE'
  | 'BRANCH_MANAGER'
  | 'BRANCH_INVENTORY'
  | 'BRANCH_FRONT_OFFICE';

const roleToEmail: Record<Role, string> = {
  SUPER_ADMIN: 'superadmin@bms.com',
  ADMIN: 'admin@bms.com',
  CENTRAL_INVENTORY_MANAGER: 'inventory@bms.com',
  FINANCE: 'finance@bms.com',
  BRANCH_MANAGER: 'manager.br01@bms.com',
  BRANCH_INVENTORY: 'stock.br01@bms.com',
  BRANCH_FRONT_OFFICE: 'counter.br01@bms.com',
};

const tokenCache = new Map<Role, string>();

export async function loginAs(role: Role): Promise<string> {
  if (tokenCache.has(role)) {
    return tokenCache.get(role)!;
  }

  const email = roleToEmail[role];
  const response = await apiClient('POST', '/auth/login', {
    body: { email, password: 'Password@123' },
  });

  if (response.status !== 200 || !response.body.data?.accessToken) {
    throw new Error(`Failed to login as ${role}: ${JSON.stringify(response.body)}`);
  }

  const token = response.body.data.accessToken;
  tokenCache.set(role, token);
  return token;
}
