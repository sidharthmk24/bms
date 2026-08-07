/**
 * UserRole — the seven staff roles in the BMS system.
 *
 * Assigned to every User row. Controls which endpoints, data, and
 * UI sections each staff member can access.
 *
 * Chain-wide roles (no branchId): SUPER_ADMIN, ADMIN, CENTRAL_INVENTORY_MANAGER
 * Branch-scoped roles (require branchId): BRANCH_MANAGER, BRANCH_INVENTORY, BRANCH_FRONT_OFFICE
 * Either/or: FINANCE (chain-wide when branchId = null, branch-scoped otherwise)
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CENTRAL_INVENTORY_MANAGER = 'CENTRAL_INVENTORY_MANAGER',
  FINANCE = 'FINANCE',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  BRANCH_INVENTORY = 'BRANCH_INVENTORY',
  BRANCH_FRONT_OFFICE = 'BRANCH_FRONT_OFFICE',
}

/**
 * Branch-scoped roles — these users MUST have a branchId on their account
 * and are restricted to data belonging to their own branch.
 */
export const BRANCH_SCOPED_ROLES: UserRole[] = [
  UserRole.BRANCH_MANAGER,
  UserRole.BRANCH_INVENTORY,
  UserRole.BRANCH_FRONT_OFFICE,
];

/**
 * Chain-wide roles — these users have no branchId and can see all branches.
 */
export const CHAIN_WIDE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.CENTRAL_INVENTORY_MANAGER,
];
