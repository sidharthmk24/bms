import { SetMetadata } from '@nestjs/common';

/**
 * BRANCH_SCOPE_KEY — metadata key read by BranchScopeGuard.
 */
export const BRANCH_SCOPE_KEY = 'branch_scope';

/**
 * @BranchScope() — marks a route as requiring branch-level scoping.
 *
 * When applied, BranchScopeGuard will verify that the branchId derived
 * from the authenticated user's JWT matches the branchId in the route
 * params or request body — enforced server-side, never trusted from client.
 *
 * Usage: `@BranchScope()`
 */
export const BranchScope = () => SetMetadata(BRANCH_SCOPE_KEY, true);
