import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/enums/user-role.enum';

/**
 * ROLES_KEY — metadata key used by RolesGuard to read the allowed roles.
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) — declares which roles may call this endpoint.
 *
 * Usage: `@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)`
 *
 * Combined with RolesGuard, any caller whose role is not in the list
 * receives a 403 Forbidden before the handler runs.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
