import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard — applied globally (or per-route) to require a valid JWT.
 *
 * If the route is decorated with @Public(), the guard is bypassed.
 * Otherwise, the Passport JWT strategy validates the token and attaches
 * the decoded payload to `request.user`.
 *
 * The actual JWT strategy (JwtStrategy) is wired in Phase 2 (auth module).
 * This stub is registered now so other Phase 0 modules can reference it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route has @Public() — if yes, skip JWT validation
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // Delegate to Passport's JWT strategy
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
