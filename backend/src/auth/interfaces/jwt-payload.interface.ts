import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Decoded payload of the JWT Access Token.
 * Extracted by JwtStrategy and attached to request.user.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  roles: UserRole[];
  primaryRole: UserRole;
  originalRoles?: UserRole[]; // Used for impersonation
  originalPrimaryRole?: UserRole;
  branchId: string | null;
}
