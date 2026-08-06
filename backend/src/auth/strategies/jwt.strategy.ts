import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * JwtStrategy — validates the access token on protected routes.
 *
 * Implements passport-jwt Strategy. Injected automatically by Passport
 * when the global or route-level JwtAuthGuard is executed.
 *
 * It attaches the returned payload object to `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'bms_jwt_secret_change_in_prod_use_long_random_string_here_64chars',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.userId || !payload.email || !payload.roles || !payload.primaryRole) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
      primaryRole: payload.primaryRole,
      originalRoles: payload.originalRoles,
      originalPrimaryRole: payload.originalPrimaryRole,
      branchId: payload.branchId,
    };
  }
}
