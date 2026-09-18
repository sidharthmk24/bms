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

/**
 * Role hierarchy from lowest priority to highest priority.
 * Used to determine the default active dashboard when a user has multiple roles assigned.
 */
export const ROLE_PRIORITY_ORDER: UserRole[] = [
  UserRole.BRANCH_FRONT_OFFICE,
  UserRole.BRANCH_INVENTORY,
  UserRole.BRANCH_MANAGER,
  UserRole.FINANCE,
  UserRole.CENTRAL_INVENTORY_MANAGER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

/**
 * Helper function to determine the highest priority role from a user's assigned roles list.
 */
export function getHighestPriorityRole(
  roles: (UserRole | string | { role?: string } | undefined | null)[] | undefined | null
): UserRole {
  if (!roles || roles.length === 0) return UserRole.BRANCH_FRONT_OFFICE;

  const roleStrings: string[] = roles
    .map(r => {
      if (!r) return '';
      if (typeof r === 'string') return r;
      if (typeof r === 'object' && 'role' in r) return (r as any).role || '';
      return '';
    })
    .filter(Boolean);

  if (roleStrings.length === 0) return UserRole.BRANCH_FRONT_OFFICE;

  let highestRole = (roleStrings[0] as UserRole) || UserRole.BRANCH_FRONT_OFFICE;
  let highestIndex = -1;

  for (const r of roleStrings) {
    const idx = ROLE_PRIORITY_ORDER.indexOf(r as UserRole);
    if (idx > highestIndex) {
      highestIndex = idx;
      highestRole = r as UserRole;
    }
  }

  return highestRole;
}
