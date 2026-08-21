import 'server-only';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { getDataSource } from '../db/data-source';
import { User } from '../api-backend/users/entities/user.entity';
import { PasswordResetToken } from '../api-backend/users/entities/password-reset-token.entity';
import { Branch } from '../api-backend/branches/entities/branch.entity';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';
import { UserRole, BRANCH_SCOPED_ROLES } from '../api-backend/users/enums/user-role.enum';
import { CreateUserDto } from '../api-backend/users/dto/create-user.dto';
import { UpdateUserDto } from '../api-backend/users/dto/update-user.dto';
import { JwtPayload } from '../auth/jwt';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import { 
  ForbiddenException, 
  ConflictException, 
  BadRequestException, 
  NotFoundException 
} from '../errors';

export class UsersService {
  private notificationsService = new NotificationsService();
  private emailService = new EmailService();

  private async getRepos() {
    const ds = await getDataSource();
    return {
      userRepo: ds.getRepository(User),
      resetRepo: ds.getRepository(PasswordResetToken),
      branchRepo: ds.getRepository(Branch),
      auditRepo: ds.getRepository(AuditLog),
    };
  }

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
    return weights[role as keyof typeof weights] || 0;
  }

  private canManageRole(creatorRole: UserRole, targetRole: UserRole): boolean {
    if (creatorRole === UserRole.SUPER_ADMIN) return true;
    return this.getRoleWeight(creatorRole) > this.getRoleWeight(targetRole);
  }

  private checkManagementAccess(currentUser: JwtPayload, targetUser: User) {
    if (hasRole(currentUser, UserRole.SUPER_ADMIN)) return;

    if (!this.canManageRole(currentUser.primaryRole, targetUser.primaryRole)) {
      throw new ForbiddenException('You do not have permission to manage this user role');
    }

    if (hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      if (currentUser.branchId !== targetUser.branchId) {
        throw new ForbiddenException('You can only manage users belonging to your own branch');
      }
    }
  }

  async findAll(currentUser: JwtPayload): Promise<User[]> {
    const { userRepo } = await this.getRepos();
    if (!hasRole(currentUser, UserRole.SUPER_ADMIN) && !hasRole(currentUser, UserRole.ADMIN) && hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      if (!currentUser.branchId) return []; // Prevent TypeORM crash if branchId is null
      return userRepo.find({
        where: { branchId: currentUser.branchId },
        relations: ['branch', 'roles'],
        order: { name: 'ASC' },
      });
    }

    return userRepo.find({
      relations: ['branch', 'roles'],
      order: { primaryRole: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload): Promise<User> {
    const { userRepo } = await this.getRepos();
    const user = await userRepo.findOne({
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
    const { userRepo, branchRepo, auditRepo } = await this.getRepos();

    const rolesToCreate = dto.roles || [];
    for (const role of rolesToCreate) {
      if (!this.canManageRole(currentUser.primaryRole, role)) {
        throw new ForbiddenException(`You do not have permission to create a ${role} user`);
      }
    }

    const existing = await userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    if (hasRole(currentUser, UserRole.BRANCH_MANAGER)) {
      if (dto.branchId !== currentUser.branchId) {
        throw new ForbiddenException('You can only create users for your own branch');
      }
      if (dto.roles.includes(UserRole.BRANCH_MANAGER)) {
        throw new ForbiddenException('You cannot create another Branch Manager');
      }
    }

    let finalBranchId = dto.branchId || null;
    const hasBranchScopedRole = dto.roles.some((r) => BRANCH_SCOPED_ROLES.includes(r));

    if (hasBranchScopedRole) {
      if (!finalBranchId) {
        throw new BadRequestException(`A branch must be specified for branch-scoped roles`);
      }
      const branch = await branchRepo.findOne({ where: { id: finalBranchId } });
      if (!branch) {
        throw new BadRequestException('The specified branch does not exist');
      }
    } else {
      const allRolesAreChainWideNonFinance = dto.roles.every(r => !BRANCH_SCOPED_ROLES.includes(r) && r !== UserRole.FINANCE);
      if (allRolesAreChainWideNonFinance && finalBranchId) {
        throw new BadRequestException(`Selected roles are chain-wide and cannot be scoped to a branch`);
      }
    }

    // Generate a temporary 8-character password
    const temporaryPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newUser = userRepo.create({
      ...dto,
      roles: dto.roles.map(r => ({ role: r })),
      branchId: finalBranchId,
      passwordHash,
      isActive: true,
      createdById: currentUser.userId,
    });

    const savedUser = await userRepo.save(newUser);

    const { passwordHash: _, ...auditPayload } = savedUser;
    await auditRepo.save({
      userId: currentUser.userId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: savedUser.id,
      beforeJson: null,
      afterJson: auditPayload,
      ipAddress,
    });

    this.notificationsService.triggerRefresh('user_changed');

    // Send the welcome email with login details
    await this.emailService.sendWelcomeEmail(savedUser.email, savedUser.name, temporaryPassword);

    return JSON.parse(JSON.stringify(savedUser));
  }

  async update(id: string, dto: UpdateUserDto, currentUser: JwtPayload, ipAddress: string): Promise<User> {
    const { userRepo, branchRepo, auditRepo } = await this.getRepos();
    const user = await this.findOne(id, currentUser);
    const beforeState = { ...user };
    delete (beforeState as any).passwordHash;

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

    if (dto.email && dto.email !== user.email) {
      const existing = await userRepo.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

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
      const branch = await branchRepo.findOne({ where: { id: finalBranchId } });
      if (!branch) {
        throw new BadRequestException('The specified branch does not exist');
      }
    } else {
      const allRolesAreChainWideNonFinance = updatedRoles.every(r => !BRANCH_SCOPED_ROLES.includes(r) && r !== UserRole.FINANCE);
      if (allRolesAreChainWideNonFinance && finalBranchId) {
        finalBranchId = null; 
      }
    }

    if (dto.roles) {
      await userRepo.manager.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
    }

    Object.assign(user, {
      ...dto,
      branchId: finalBranchId,
    });
    
    if (dto.roles) {
      user.roles = dto.roles.map(r => ({ role: r, userId: id })) as any[];
    }

    const savedUser = await userRepo.save(user);

    const { passwordHash: _, ...auditPayload } = savedUser;
    await auditRepo.save({
      userId: currentUser.userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      beforeJson: beforeState,
      afterJson: auditPayload,
      ipAddress,
    });

    this.notificationsService.triggerRefresh('user_changed');

    return JSON.parse(JSON.stringify(savedUser));
  }

  async updateStatus(id: string, isActive: boolean, currentUser: JwtPayload, ipAddress: string): Promise<void> {
    const { userRepo, auditRepo } = await this.getRepos();
    const user = await this.findOne(id, currentUser);

    if (user.id === currentUser.userId) {
      throw new BadRequestException('You cannot change your own status');
    }

    if (hasRole(user as any, UserRole.SUPER_ADMIN) && !hasRole(currentUser, UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only a Super Admin can modify a Super Admin');
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await userRepo.save(user);

    await auditRepo.save({
      userId: currentUser.userId,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      beforeJson: { email: user.email, isActive: previousStatus },
      afterJson: { email: user.email, isActive: isActive },
      ipAddress,
    });

    this.notificationsService.triggerRefresh('user_changed');
  }

  async sendReset(id: string, currentUser: JwtPayload, ipAddress: string): Promise<void> {
    const { auditRepo } = await this.getRepos();
    const user = await this.findOne(id, currentUser);
    
    if (!user.isActive) {
      throw new BadRequestException('Cannot reset password for deactivated user');
    }

    if (currentUser.primaryRole !== UserRole.SUPER_ADMIN && currentUser.primaryRole !== UserRole.ADMIN) {
      if (!user.branchId) {
        throw new BadRequestException('Cannot remove branch from a non-admin user');
      }
    }

    await this.sendSetupResetToken(user);

    await auditRepo.save({
      userId: currentUser.userId,
      action: 'USER_RESET_TRIGGERED',
      entityType: 'User',
      entityId: id,
      beforeJson: null,
      afterJson: { email: user.email, triggeredBy: currentUser.email },
      ipAddress,
    });
  }

  private async sendSetupResetToken(user: User): Promise<void> {
    const { resetRepo } = await this.getRepos();
    const token = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await resetRepo.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const setupLink = `${baseUrl}/reset-password?token=${token}`;

    console.log('\n' + '✉️ '.repeat(20));
    console.log(`[MOCK EMAIL] Setup/Reset Password Link for ${user.name} (${user.email})`);
    console.log(`Link: ${setupLink}`);
    console.log('✉️ '.repeat(20) + '\n');
  }
}
