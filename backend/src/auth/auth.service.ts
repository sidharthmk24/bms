import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ── Entity imports ────────────────────────────────────────────────────────────
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── DTOs & Interfaces ────────────────────────────────────────────────────────
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'bms_jwt_secret_change_in_prod_use_long_random_string_here_64chars';
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'bms_refresh_secret_change_in_prod_use_different_long_random_string';
    this.refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  /**
   * Passport Local Strategy validation.
   * Compares password with stored hash.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['branch', 'roles'],
    });

    if (user && bcrypt.compareSync(pass, user.passwordHash)) {
      // Remove sensitive data before returning
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async verifyEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Account not found');
    }

    return {
      exists: true,
      status: user.passwordHash === 'PENDING_SETUP' ? 'PENDING_SETUP' : 'ACTIVE',
    };
  }

  async setupPassword(email: string, password: string, userAgent: string) {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['branch', 'roles'],
    });

    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (user.passwordHash !== 'PENDING_SETUP') {
      throw new BadRequestException('Account is already setup. Please use normal login.');
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    await this.userRepository.update(user.id, { passwordHash });

    // Refresh user object after update
    user.passwordHash = passwordHash;

    return this.login(user, userAgent);
  }

  /**
   * login — generates access and refresh tokens.
   * Updates lastLoginAt on the user.
   */
  async login(user: any, userAgent: string) {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map((r: any) => r.role) || [],
      primaryRole: user.primaryRole,
      branchId: user.branchId,
    };

    // Update user's last login timestamp
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const accessToken = this.generateAccessToken(payload);
    const rawRefreshToken = this.generateRefreshTokenValue();

    // Save hashed refresh token in DB
    const tokenHash = bcrypt.hashSync(rawRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles?.map((r: any) => r.role) || [],
        primaryRole: user.primaryRole,
        branchId: user.branchId,
      },
    };
  }

  /**
   * impersonate — allows a SUPER_ADMIN to generate a temporary token 
   * for a different role (and branch) without changing their actual credentials.
   */
  async impersonate(currentUser: JwtPayload, targetRole: string, targetBranchId?: string) {
    // 1. Ensure the user is actually a SUPER_ADMIN originally
    const isOriginalSuperAdmin = currentUser.primaryRole.includes(UserRole.SUPER_ADMIN) || currentUser.originalRoles?.includes(UserRole.SUPER_ADMIN);
    if (!isOriginalSuperAdmin) {
      throw new UnauthorizedException('Only Super Admins can impersonate roles');
    }

    // 2. Fetch the user to get their latest data
    const user = await this.userRepository.findOne({ where: { id: currentUser.userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('User no longer active or exists');
    }

    // 3. Create a payload with the new role and branchId, keeping the original ID
    // We store the originalRole so they can keep impersonating or switch back
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: Array.from(new Set([...currentUser.roles, targetRole as UserRole])),
      primaryRole: targetRole as UserRole,
      originalRoles: currentUser.originalRoles || currentUser.roles,
      originalPrimaryRole: currentUser.originalPrimaryRole || currentUser.primaryRole,
      branchId: targetBranchId || null,
    };

    // 4. Generate only an access token. We don't generate refresh tokens for impersonation.
    // The user's original refresh token in their browser is cleared/overwritten when they switch,
    // so this is a temporary session. If it expires, they just log in again.
    const accessToken = this.generateAccessToken(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: Array.from(new Set([...currentUser.roles, targetRole as UserRole])),
        primaryRole: targetRole,
        originalRoles: currentUser.originalRoles || currentUser.roles,
        originalPrimaryRole: currentUser.originalPrimaryRole || currentUser.primaryRole,
        branchId: targetBranchId || null,
      },
    };
  }

  /**
   * refresh — rotates both access and refresh tokens.
   * Handles detection of stolen/compromised refresh tokens.
   */
  async refresh(rawRefreshToken: string, userAgent: string) {
    // 1. Locate token by checking all active tokens for this hash
    // Since we don't have the userId yet, we find active tokens that haven't expired or been revoked.
    const activeTokens = await this.refreshTokenRepository.find({
      where: { revokedAt: null },
    });

    let matchedToken: RefreshToken | null = null;
    for (const t of activeTokens) {
      if (bcrypt.compareSync(rawRefreshToken, t.tokenHash)) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token has expired
    if (new Date() > matchedToken.expiresAt) {
      // Revoke it
      await this.refreshTokenRepository.update(matchedToken.id, { revokedAt: new Date() });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // 2. Load user
    const user = await this.userRepository.findOne({
      where: { id: matchedToken.userId, isActive: true },
      relations: ['branch', 'roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User no longer active or exists');
    }

    // 3. Mark old token as revoked/rotated
    await this.refreshTokenRepository.update(matchedToken.id, { revokedAt: new Date() });

    // 4. Generate new tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map((r: any) => r.role) || [],
      primaryRole: user.primaryRole,
      branchId: user.branchId,
    };

    const newAccessToken = this.generateAccessToken(payload);
    const newRawRefreshToken = this.generateRefreshTokenValue();

    // 5. Save new refresh token in DB
    const newTokenHash = bcrypt.hashSync(newRawRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
      userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * logout — revokes the current refresh token.
   */
  async logout(rawRefreshToken: string) {
    const activeTokens = await this.refreshTokenRepository.find({
      where: { revokedAt: null },
    });

    let matchedToken: RefreshToken | null = null;
    for (const t of activeTokens) {
      if (bcrypt.compareSync(rawRefreshToken, t.tokenHash)) {
        matchedToken = t;
        break;
      }
    }

    if (matchedToken) {
      await this.refreshTokenRepository.update(matchedToken.id, { revokedAt: new Date() });
    }
  }

  /**
   * forgotPassword — generates a reset token and mocks an email log.
   */
  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    // Enforce security best practice: don't reveal if user exists or not.
    // Always return success, but only seed/log if user exists.
    if (!user) {
      console.warn(`[ForgotPassword] Password reset requested for non-existent/inactive email: ${email}`);
      return;
    }

    // Generate UUID token
    const token = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Save token
    await this.passwordResetTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetLink = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    // Log the mock email contents to console (essential for development since we have no SMTP)
    console.log('\n' + '✉️ '.repeat(20));
    console.log(`[MOCK EMAIL] Password Reset Link for ${user.name} (${user.email})`);
    console.log(`Link: ${resetLink}`);
    console.log('✉️ '.repeat(20) + '\n');
  }

  /**
   * resetPassword — consumes the token and updates the user's password.
   */
  async resetPassword(dto: ResetPasswordDto, ipAddress: string) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('This reset token has expired');
    }

    const user = resetToken.user;
    if (!user || !user.isActive) {
      throw new BadRequestException('User is no longer active');
    }

    // Update password hash
    const passwordHash = bcrypt.hashSync(dto.newPassword, 10);
    await this.userRepository.update(user.id, { passwordHash });

    // Mark token as used
    await this.passwordResetTokenRepository.update(resetToken.id, { usedAt: new Date() });

    // Write audit log
    await this.auditLogRepository.save({
      userId: user.id,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      beforeJson: null,
      afterJson: { email: user.email, action: 'RESET_PASSWORD' },
      ipAddress,
    });
  }

  /**
   * changePassword — allows authenticated users to update their own password.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress: string) {
    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!bcrypt.compareSync(dto.currentPassword, user.passwordHash)) {
      throw new BadRequestException('Incorrect current password');
    }

    // Update password
    const passwordHash = bcrypt.hashSync(dto.newPassword, 10);
    await this.userRepository.update(userId, { passwordHash });

    // Write audit log
    await this.auditLogRepository.save({
      userId,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      beforeJson: null,
      afterJson: { email: user.email, action: 'CHANGE_PASSWORD' },
      ipAddress,
    });
  }

  // ── Helper methods ──────────────────────────────────────────────────────────
  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn,
    });
  }

  private generateRefreshTokenValue(): string {
    return crypto.randomBytes(40).toString('hex');
  }
}
