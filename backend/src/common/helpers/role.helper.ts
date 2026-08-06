import { UserRole } from '../../users/enums/user-role.enum';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

export function hasRole(user: JwtPayload | User, role: UserRole): boolean {
  if (!user.roles) return false;
  if (Array.isArray(user.roles)) {
    // If it's a User entity, roles might be an array of UserRole objects
    // Wait, the User entity's `roles` property is an array of `UserRole` entity objects which has a `role` property.
    // If it's a JwtPayload, `roles` is an array of strings (UserRole enum values).
    return user.roles.some((r: any) => (r.role ? r.role === role : r === role));
  }
  return false;
}

export function hasAnyRole(user: JwtPayload | User, roles: UserRole[]): boolean {
  if (!user.roles) return false;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r: any) => roles.includes(r.role ? r.role : r));
  }
  return false;
}
