import 'server-only';
import { NextRequest, NextResponse } from "next/server";
import { verifyJwt, JwtPayload } from "../auth/jwt";
import { UserRole } from "../api-backend/users/enums/user-role.enum";
import { apiError } from "../api-response";
import { UnauthorizedException, ForbiddenException } from "../errors";

export type AuthenticatedRequest = NextRequest & { user: JwtPayload };

type Handler = (req: AuthenticatedRequest, context: any) => Promise<NextResponse> | NextResponse;

// Base Authentication Wrapper
export function withAuth(handler: Handler) {
  return async (req: NextRequest, context: any) => {
    let payload;
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedException("Missing or invalid authorization header");
      }

      const token = authHeader.split(" ")[1];
      payload = verifyJwt(token);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        return apiError(error);
      }
      return apiError(new UnauthorizedException("Token expired or invalid"));
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = payload;
    
    // Inject user into context so routes doing `(req, { user })` don't break
    const authContext = context || {};
    authContext.user = payload;

    try {
      return await handler(authReq, authContext);
    } catch (error: any) {
      console.error('[withAuth] API Error:', error);
      return apiError(error);
    }
  };
}

// Role Authorization Wrapper
export function withRoles(roles: UserRole[], handler: Handler) {
  return withAuth(async (req, context) => {
    const hasRole = req.user.roles.some((role) => roles.includes(role));
    if (!hasRole) {
      return apiError(new ForbiddenException("Insufficient permissions"));
    }
    return handler(req, context);
  });
}

// Branch Scope Authorization Wrapper
export function withBranchScope(handler: Handler) {
  return withAuth(async (req, context) => {
    if (!req.user.branchId && !req.user.roles.includes(UserRole.SUPER_ADMIN)) {
      return apiError(new ForbiddenException("Branch scope required"));
    }
    return handler(req, context);
  });
}
