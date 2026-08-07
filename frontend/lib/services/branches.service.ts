import 'server-only';
import { getDataSource } from '../db/data-source';
import { Branch, BranchType } from '../api-backend/branches/entities/branch.entity';
import { CreateBranchDto } from '../api-backend/branches/dto/create-branch.dto';
import { UpdateBranchDto } from '../api-backend/branches/dto/update-branch.dto';
import { NotificationsService } from './notifications.service';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';
import { ConflictException, NotFoundException } from '../errors';

export class BranchesService {
  private notificationsService = new NotificationsService();

  private async getRepos() {
    const ds = await getDataSource();
    return {
      branchRepo: ds.getRepository<Branch>("Branch"),
      auditRepo: ds.getRepository<AuditLog>("AuditLog"),
    };
  }

  async findAll(): Promise<Branch[]> {
    const { branchRepo } = await this.getRepos();
    return branchRepo.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<Branch> {
    const { branchRepo } = await this.getRepos();
    const branch = await branchRepo.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async create(dto: CreateBranchDto, userId: string, ipAddress: string): Promise<Branch> {
    const { branchRepo, auditRepo } = await this.getRepos();

    const existing = await branchRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Branch code ${dto.code} already exists`);
    }

    if (dto.type === BranchType.WAREHOUSE) {
      const warehouse = await branchRepo.findOne({
        where: { type: BranchType.WAREHOUSE },
      });
      if (warehouse) {
        throw new ConflictException('A central warehouse already exists in the system');
      }
    }

    const newBranch = branchRepo.create(dto);
    const branch = await branchRepo.save(newBranch);

    const auditLog = auditRepo.create({
      userId,
      action: 'BRANCH_CREATED',
      entityType: 'Branch',
      entityId: branch.id,
      beforeJson: null,
      afterJson: branch,
      ipAddress,
    });
    await auditRepo.save(auditLog);

    this.notificationsService.triggerRefresh('branch_changed');

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, userId: string, ipAddress: string): Promise<Branch> {
    const { branchRepo, auditRepo } = await this.getRepos();
    const branch = await this.findOne(id);
    const beforeState = { ...branch };

    if (dto.code && dto.code !== branch.code) {
      const existing = await branchRepo.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Branch code ${dto.code} already exists`);
      }
    }

    if (dto.type === BranchType.WAREHOUSE && branch.type !== BranchType.WAREHOUSE) {
      const warehouse = await branchRepo.findOne({
        where: { type: BranchType.WAREHOUSE },
      });
      if (warehouse) {
        throw new ConflictException('A central warehouse already exists in the system');
      }
    }

    Object.assign(branch, dto);
    const updated = await branchRepo.save(branch);

    const auditLog = auditRepo.create({
      userId,
      action: 'BRANCH_UPDATED',
      entityType: 'Branch',
      entityId: id,
      beforeJson: beforeState,
      afterJson: updated,
      ipAddress,
    });
    await auditRepo.save(auditLog);

    this.notificationsService.triggerRefresh('branch_changed');

    return updated;
  }
}
