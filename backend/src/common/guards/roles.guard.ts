import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { hasRole, hasAnyRole } from '../helpers/role.helper';

/**
 * RolesGuard — enforces @Roles(...) on a handler.
 *
 * After JwtAuthGuard populates request.user with the decoded payload,
 * this guard checks whether user.primaryRole is in the list of permitted roles.
 *
 * If no @Roles() decorator is present, the guard passes (route is role-open
 * but still JWT-protected unless also marked @Public()).
 *
 * Must run AFTER JwtAuthGuard so request.user is already populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Retrieve the roles metadata from the handler or its class
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    
    // Allow SUPER_ADMIN (or an impersonating SUPER_ADMIN) to bypass role checks
    if (hasRole(user, UserRole.SUPER_ADMIN) || (user?.originalRoles && user.originalRoles.includes(UserRole.SUPER_ADMIN))) {
      return true;
    }

    if (!user || !hasAnyRole(user, requiredRoles)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
