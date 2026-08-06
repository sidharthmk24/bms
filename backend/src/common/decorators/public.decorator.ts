import { SetMetadata } from '@nestjs/common';

/**
 * IS_PUBLIC_KEY — metadata key read by JwtAuthGuard.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — bypasses JWT authentication for a route.
 *
 * JwtAuthGuard checks for this metadata and skips token validation
 * when present. Use only on login, forgot-password, and reset-password.
 *
 * Usage: `@Public()`
 *
 * DO NOT use on any route that returns user data or modifies state.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
