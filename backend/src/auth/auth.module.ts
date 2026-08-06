import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// ── Entity imports ────────────────────────────────────────────────────────────
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── Controllers, Services & Strategies ──────────────────────────────────────
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

// ── Guards ────────────────────────────────────────────────────────────────────
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BranchScopeGuard } from '../common/guards/branch-scope.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken, AuditLog]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'bms_jwt_secret_change_in_prod_use_long_random_string_here_64chars',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    // Enforce JWT Auth globally by default (opt-out via @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Enforce Role authorization globally (respects @Roles())
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Enforce Branch scoping globally (respects @BranchScope())
    {
      provide: APP_GUARD,
      useClass: BranchScopeGuard,
    },
  ],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
