import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BRANCH_SCOPE_KEY } from '../decorators/branch-scope.decorator';
import { BRANCH_SCOPED_ROLES } from '../../users/enums/user-role.enum';

/**
 * BranchScopeGuard — ensures branch-scoped roles only access their own branch.
 *
 * When @BranchScope() is applied to a route, this guard:
 * 1. Checks if the user has a branch-scoped role.
 * 2. Compares user.branchId (from JWT) against the branchId in route params.
 * 3. Chain-wide roles (SUPER_ADMIN, ADMIN, etc.) always pass.
 *
 * WHY: branchId in the request body or params must NEVER be trusted from
 * the client. The authoritative branchId lives in the JWT, signed server-side.
 *
 * Must run AFTER JwtAuthGuard and RolesGuard.
 */
@Injectable()
export class BranchScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Only enforce when the route is explicitly marked with @BranchScope()
    const isBranchScoped = this.reflector.getAllAndOverride<boolean>(
      BRANCH_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isBranchScoped) return true;

    const request = context.switchToHttp().getRequest();
    const { user, params } = request;

    if (!user) return false;

    // Chain-wide roles can access any branch — pass through
    // If ANY of the user's roles are NOT branch-scoped, they bypass the branch restriction
    const hasChainWideRole = user.roles?.some((r: any) => !BRANCH_SCOPED_ROLES.includes(r));
    if (hasChainWideRole) return true;

    // For branch-scoped roles: the branchId in the route MUST match the JWT
    const routeBranchId = params?.branchId;
    if (routeBranchId && user.branchId !== routeBranchId) {
      throw new ForbiddenException(
        'You can only access resources belonging to your own branch.',
      );
    }

    return true;
  }
}
