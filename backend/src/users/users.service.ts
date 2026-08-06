import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ── Entity imports ────────────────────────────────────────────────────────────
import { User } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── Enums & DTOs ─────────────────────────────────────────────────────────────
import { UserRole, BRANCH_SCOPED_ROLES } from './enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { hasRole } from '../common/helpers/role.helper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper to determine role management weight.
   * Higher weight means higher privileges.
   */
  private getRoleWeight(role: UserRole): number {
    const weights = {
      [UserRole.SUPER_ADMIN]: 100,
      [UserRole.ADMIN]: 90,
      [UserRole.CENTRAL_INVENTORY_MANAGER]: 80,
      [UserRole.FINANCE]: 70,
      [UserRole.BRANCH_MANAGER]: 60,
      [UserRole.BRANCH_INVENTORY]: 50,
      [UserRole.BRANCH_FRONT_OFFICE]: 40,
    };
    return weights[role] || 0;
  }

  /**
   * Enforces role hierarchies.
   * A user can only manage roles strictly below themselves.
   * Exception: SUPER_ADMIN can manage everything.
   */
  private canManageRole(creatorRole: UserRole, targetRole: UserRole): boolean {
    if (creatorRole === UserRole.SUPER_ADMIN) return true;
    return this.getRoleWeight(creatorRole) > this.getRoleWeight(targetRole);
  }

  /**
   * Enforces user management scope and boundaries.
   */
  private checkManagementAccess(currentUser: JwtPayload, targetUser: User) {
    if (hasRole(currentUser, UserRole.SUPER_ADMIN)) return;

    // Check role hierarchy
    // Check role hierarchy - check against target user's primary role
    if (!this.canManageRole(currentUser.primaryRole, targetUser.primaryRole)) {
      throw new ForbiddenException('You do not have permission to manage this user role');
    }

    // Branch managers are scoped to their own branch
    if (hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      if (currentUser.branchId !== targetUser.branchId) {
        throw new ForbiddenException('You can only manage users belonging to your own branch');
      }
    }
  }

  async findAll(currentUser: JwtPayload): Promise<User[]> {
    // Branch managers only see users of their own branch
    if (hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      return this.userRepository.find({
        where: { branchId: currentUser.branchId },
        relations: ['branch'],
        order: { name: 'ASC' },
      });
    }

    // Chain-wide roles see all users
    return this.userRepository.find({
      relations: ['branch', 'roles'],
      order: { primaryRole: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['branch', 'roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.checkManagementAccess(currentUser, user);
    return user;
  }

  async create(dto: CreateUserDto, currentUser: JwtPayload, ipAddress: string): Promise<User> {
    // 1. Check permissions to create target role
    for (const role of dto.roles) {
      if (!this.canManageRole(currentUser.primaryRole, role)) {
        throw new ForbiddenException(`You do not have permission to create a ${role} user`);
      }
    }

    // 2. Validate email uniqueness
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    // 3. Enforce branch scoping constraints
    if (hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      // Branch Managers can only create staff for their own branch
      if (dto.branchId !== currentUser.branchId) {
        throw new ForbiddenException('You can only create users for your own branch');
      }
      // Branch Managers can only create branch-scoped roles below them
      if (dto.roles.includes(UserRole.BRANCH_MANAGER)) {
        throw new ForbiddenException('You cannot create another Branch Manager');
      }
    }

    // Verify branch exists if any role is branch-scoped, or clear branchId for chain-wide roles
    let finalBranchId = dto.branchId || null;
    const hasBranchScopedRole = dto.roles.some((r) => BRANCH_SCOPED_ROLES.includes(r));

    if (hasBranchScopedRole) {
      if (!finalBranchId) {
        throw new BadRequestException(`A branch must be specified for branch-scoped roles`);
      }
      const branch = await this.branchRepository.findOne({ where: { id: finalBranchId } });
      if (!branch) {
        throw new BadRequestException('The specified branch does not exist');
      }
    } else {
      // Chain-wide roles (except FINANCE, which is either/or) must not have branchId set
      const allRolesAreChainWideNonFinance = dto.roles.every(r => !BRANCH_SCOPED_ROLES.includes(r) && r !== UserRole.FINANCE);
      if (allRolesAreChainWideNonFinance && finalBranchId) {
        throw new BadRequestException(`Selected roles are chain-wide and cannot be scoped to a branch`);
      }
    }

    // 4. Create user with pending setup flag
    const passwordHash = 'PENDING_SETUP';

    const newUser = this.userRepository.create({
      ...dto,
      roles: dto.roles.map(r => ({ role: r })),
      branchId: finalBranchId,
      passwordHash,
      isActive: true,
      createdById: currentUser.userId,
    });

    const savedUser = await this.userRepository.save(newUser);

    // 5. Audit Log
    const { passwordHash: _, ...auditPayload } = savedUser;
    await this.auditLogRepository.save({
      userId: currentUser.userId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: savedUser.id,
      beforeJson: null,
      afterJson: auditPayload,
      ipAddress,
    });

    // 6. SSE Sync Event
    this.notificationsService.triggerRefresh('user_changed');

    // 7. (Skipped) Password will be set via identifier-first login flow

    return savedUser;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: JwtPayload, ipAddress: string): Promise<User> {
    const user = await this.findOne(id, currentUser);
    const beforeState = { ...user };
    delete beforeState.passwordHash;

    // 1. Check permissions to change user to the new roles
    if (dto.roles) {
      for (const currentRole of user.roles) {
        if (!this.canManageRole(currentUser.primaryRole, currentRole.role)) {
          throw new ForbiddenException('You do not have permission to modify this user\'s roles');
        }
      }
      for (const newRole of dto.roles) {
        if (!this.canManageRole(currentUser.primaryRole, newRole)) {
          throw new ForbiddenException(`You do not have permission to assign the ${newRole} role`);
        }
      }
    }

    // 2. Validate email uniqueness
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    // 3. Enforce branch scoping on update
    if (hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      if (dto.branchId && dto.branchId !== currentUser.branchId) {
        throw new ForbiddenException('You cannot reassign users to other branches');
      }
    }

    const updatedRoles = dto.roles || user.roles.map(r => r.role);
    let finalBranchId = dto.branchId !== undefined ? dto.branchId : user.branchId;
    const hasBranchScopedRole = updatedRoles.some((r) => BRANCH_SCOPED_ROLES.includes(r));

    if (hasBranchScopedRole) {
      if (!finalBranchId) {
        throw new BadRequestException(`A branch must be specified for branch-scoped roles`);
      }
      const branch = await this.branchRepository.findOne({ where: { id: finalBranchId } });
      if (!branch) {
        throw new BadRequestException('The specified branch does not exist');
      }
    } else {
      const allRolesAreChainWideNonFinance = updatedRoles.every(r => !BRANCH_SCOPED_ROLES.includes(r) && r !== UserRole.FINANCE);
      if (allRolesAreChainWideNonFinance && finalBranchId) {
        finalBranchId = null; // automatically clear branch for chain roles
      }
    }

    // 4. If roles are being updated, delete existing roles first to prevent unique constraint violations
    if (dto.roles) {
      await this.userRepository.manager.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
    }

    // Apply updates
    Object.assign(user, {
      ...dto,
      branchId: finalBranchId,
    });
    
    // Explicitly set the roles array with the user_id if we are updating roles
    if (dto.roles) {
      user.roles = dto.roles.map(r => ({ role: r, userId: id })) as any[];
    }

    const savedUser = await this.userRepository.save(user);

    // Audit Log
    const { passwordHash: _, ...auditPayload } = savedUser;
    await this.auditLogRepository.save({
      userId: currentUser.userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      beforeJson: beforeState,
      afterJson: auditPayload,
      ipAddress,
    });

    // SSE Sync Event
    this.notificationsService.triggerRefresh('user_changed');

    return savedUser;
  }

  async updateStatus(id: string, isActive: boolean, currentUser: JwtPayload, ipAddress: string): Promise<void> {
    const user = await this.findOne(id, currentUser);

    if (user.id === currentUser.userId) {
      throw new BadRequestException('You cannot change your own status');
    }

    if (hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(currentUser, UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only a Super Admin can modify a Super Admin');
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await this.userRepository.save(user);

    // Audit Log
    await this.auditLogRepository.save({
      userId: currentUser.userId,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      beforeJson: { email: user.email, isActive: previousStatus },
      afterJson: { email: user.email, isActive: isActive },
      ipAddress,
    });

    // SSE Sync Event
    this.notificationsService.triggerRefresh('user_changed');
  }

  async sendReset(id: string, currentUser: JwtPayload, ipAddress: string): Promise<void> {
    const user = await this.findOne(id, currentUser);
    
    if (!user.isActive) {
      throw new BadRequestException('Cannot reset password for deactivated user');
    }

    await this.sendSetupResetToken(user);

    // Audit Log
    await this.auditLogRepository.save({
      userId: currentUser.userId,
      action: 'USER_RESET_TRIGGERED',
      entityType: 'User',
      entityId: id,
      beforeJson: null,
      afterJson: { email: user.email, triggeredBy: currentUser.email },
      ipAddress,
    });
  }

  // Helper to generate password reset token during creation/reset trigger
  private async sendSetupResetToken(user: User): Promise<void> {
    const token = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour setup window

    await this.passwordResetTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const setupLink = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    console.log('\n' + '✉️ '.repeat(20));
    console.log(`[MOCK EMAIL] Setup/Reset Password Link for ${user.name} (${user.email})`);
    console.log(`Link: ${setupLink}`);
    console.log('✉️ '.repeat(20) + '\n');
  }
}
