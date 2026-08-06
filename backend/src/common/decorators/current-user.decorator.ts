import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser — extracts the authenticated user from the JWT payload
 * attached to the request by JwtAuthGuard.
 *
 * Usage: `@CurrentUser() user: JwtPayload`
 *
 * Why a decorator: keeps controllers clean — no `req.user` casting everywhere.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
