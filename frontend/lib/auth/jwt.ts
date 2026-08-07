import 'server-only';
import * as jwt from "jsonwebtoken";
import { UserRole } from "../api-backend/users/enums/user-role.enum";

export interface JwtPayload {
  userId: string;
  email: string;
  roles: UserRole[];
  primaryRole: UserRole;
  originalRoles?: UserRole[];
  originalPrimaryRole?: UserRole;
  branchId: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";

export const signJwt = (payload: JwtPayload, expiresIn = "1d"): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyJwt = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
