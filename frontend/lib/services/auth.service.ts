import 'server-only';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IsNull } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { User } from '../api-backend/users/entities/user.entity';
import { RefreshToken } from '../api-backend/users/entities/refresh-token.entity';
import { PasswordResetToken } from '../api-backend/users/entities/password-reset-token.entity';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';
import { JwtPayload, signJwt } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { 
  UnauthorizedException, 
  BadRequestException, 
  NotFoundException 
} from '../errors';
type ResetPasswordDto = { token: string; newPassword: string };
type ChangePasswordDto = { currentPassword: string; newPassword: string };

export class AuthService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      userRepo: ds.getRepository(User),
      refreshRepo: ds.getRepository(RefreshToken),
      resetRepo: ds.getRepository(PasswordResetToken),
      auditRepo: ds.getRepository(AuditLog),
    };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const { userRepo } = await this.getRepos();
    const user = await userRepo.findOne({
      where: { email, isActive: true },
      relations: ['branch', 'roles'],
    });

    if (user && bcrypt.compareSync(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async verifyEmail(email: string) {
    const { userRepo } = await this.getRepos();
    const user = await userRepo.findOne({
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
    const { userRepo } = await this.getRepos();
    const user = await userRepo.findOne({
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
    await userRepo.update(user.id, { passwordHash });

    user.passwordHash = passwordHash;
    return this.login(user, userAgent);
  }

  async login(user: any, userAgent: string) {
    const { userRepo, refreshRepo } = await this.getRepos();
    
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map((r: any) => r.role) || [],
      primaryRole: user.primaryRole,
      branchId: user.branchId,
    };

    await userRepo.update(user.id, { lastLoginAt: new Date() });

    const accessToken = signJwt(payload, '7d');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = bcrypt.hashSync(rawRefreshToken, 10);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshRepo.save({
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

  async impersonate(currentUser: JwtPayload, targetRole: string, targetBranchId?: string) {
    const { userRepo } = await this.getRepos();
    const isOriginalSuperAdmin = currentUser.roles?.includes(UserRole.SUPER_ADMIN) || currentUser.originalRoles?.includes(UserRole.SUPER_ADMIN);
    
    if (!isOriginalSuperAdmin) {
      throw new UnauthorizedException('Only Super Admins can impersonate roles');
    }

    const user = await userRepo.findOne({ where: { id: currentUser.userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('User no longer active or exists');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: [targetRole as UserRole],
      primaryRole: targetRole as UserRole,
      originalRoles: currentUser.originalRoles || currentUser.roles,
      originalPrimaryRole: currentUser.originalPrimaryRole || currentUser.primaryRole,
      branchId: targetBranchId || null,
    };

    const accessToken = signJwt(payload, '7d');

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: [targetRole as UserRole],
        primaryRole: targetRole,
        originalRoles: currentUser.originalRoles || currentUser.roles,
        originalPrimaryRole: currentUser.originalPrimaryRole || currentUser.primaryRole,
        branchId: targetBranchId || null,
      },
    };
  }

  async refresh(rawRefreshToken: string, userAgent: string) {
    const { userRepo, refreshRepo } = await this.getRepos();
    
    const activeTokens = await refreshRepo.find({
      where: { revokedAt: IsNull() },
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

    if (new Date() > matchedToken.expiresAt) {
      await refreshRepo.update(matchedToken.id, { revokedAt: new Date() });
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await userRepo.findOne({
      where: { id: matchedToken.userId, isActive: true },
      relations: ['branch', 'roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User no longer active or exists');
    }

    await refreshRepo.update(matchedToken.id, { revokedAt: new Date() });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map((r: any) => r.role) || [],
      primaryRole: user.primaryRole,
      branchId: user.branchId,
    };

    const newAccessToken = signJwt(payload, '7d');
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = bcrypt.hashSync(newRawRefreshToken, 10);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshRepo.save({
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

  async logout(rawRefreshToken: string) {
    const { refreshRepo } = await this.getRepos();
    const activeTokens = await refreshRepo.find({
      where: { revokedAt: IsNull() },
    });

    let matchedToken: RefreshToken | null = null;
    for (const t of activeTokens) {
      if (bcrypt.compareSync(rawRefreshToken, t.tokenHash)) {
        matchedToken = t;
        break;
      }
    }

    if (matchedToken) {
      await refreshRepo.update(matchedToken.id, { revokedAt: new Date() });
    }
  }

  async forgotPassword(email: string) {
    const { userRepo, resetRepo } = await this.getRepos();
    const user = await userRepo.findOne({
      where: { email, isActive: true },
    });

    if (!user) {
      console.warn(`[ForgotPassword] Password reset requested for non-existent/inactive email: ${email}`);
      return;
    }

    const token = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await resetRepo.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    console.log('\n' + '✉️ '.repeat(20));
    console.log(`[MOCK EMAIL] Password Reset Link for ${user.name} (${user.email})`);
    console.log(`Link: ${resetLink}`);
    console.log('✉️ '.repeat(20) + '\n');
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress: string) {
    const { userRepo, resetRepo, auditRepo } = await this.getRepos();
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetToken = await resetRepo.findOne({
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

    const passwordHash = bcrypt.hashSync(dto.newPassword, 10);
    await userRepo.update(user.id, { passwordHash });

    await resetRepo.update(resetToken.id, { usedAt: new Date() });

    await auditRepo.save({
      userId: user.id,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      beforeJson: null,
      afterJson: { email: user.email, action: 'RESET_PASSWORD' },
      ipAddress,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress: string) {
    const { userRepo, auditRepo } = await this.getRepos();
    const user = await userRepo.findOne({ where: { id: userId, isActive: true } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!bcrypt.compareSync(dto.currentPassword, user.passwordHash)) {
      throw new BadRequestException('Incorrect current password');
    }

    const passwordHash = bcrypt.hashSync(dto.newPassword, 10);
    await userRepo.update(userId, { passwordHash });

    await auditRepo.save({
      userId,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      beforeJson: null,
      afterJson: { email: user.email, action: 'CHANGE_PASSWORD' },
      ipAddress,
    });
  }
}
