import { UserRole } from '../../users/enums/user-role.enum';
import { JwtPayload } from '../../../auth/jwt';
import { User } from '../../users/entities/user.entity';

export function hasRole(user: JwtPayload | User, role: UserRole): boolean {
  if (user.primaryRole === role || (user as any).role === role) {
    return true;
  }
  if (!user.roles) return false;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r: any) => {
      if (!r) return false;
      return r.role ? r.role === role : r === role;
    });
  }
  return false;
}

export function hasAnyRole(user: JwtPayload | User, roles: UserRole[]): boolean {
  if (roles.includes(user.primaryRole as UserRole) || roles.includes((user as any).role as UserRole)) {
    return true;
  }
  if (!user.roles) return false;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r: any) => {
      if (!r) return false;
      return roles.includes(r.role ? r.role : r);
    });
  }
  return false;
}
