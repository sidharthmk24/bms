import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * LocalAuthGuard — applied on the login endpoint.
 * Activates the Passport local strategy.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
