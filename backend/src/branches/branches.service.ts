import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, BranchType } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(): Promise<Branch[]> {
    return this.branchRepository.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async create(dto: CreateBranchDto, userId: string, ipAddress: string): Promise<Branch> {
    // 1. Check unique branch code
    const existing = await this.branchRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Branch code ${dto.code} already exists`);
    }

    // 2. Ensure only one warehouse exists
    if (dto.type === BranchType.WAREHOUSE) {
      const warehouse = await this.branchRepository.findOne({
        where: { type: BranchType.WAREHOUSE },
      });
      if (warehouse) {
        throw new ConflictException('A central warehouse already exists in the system');
      }
    }

    // 3. Save branch
    const branch = await this.branchRepository.save(dto);

    // 4. Log audit event
    await this.auditLogRepository.save({
      userId,
      action: 'BRANCH_CREATED',
      entityType: 'Branch',
      entityId: branch.id,
      beforeJson: null,
      afterJson: branch,
      ipAddress,
    });

    // 5. SSE trigger refresh
    this.notificationsService.triggerRefresh('branch_changed');

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, userId: string, ipAddress: string): Promise<Branch> {
    const branch = await this.findOne(id);
    const beforeState = { ...branch };

    // Check code unique if updated
    if (dto.code && dto.code !== branch.code) {
      const existing = await this.branchRepository.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Branch code ${dto.code} already exists`);
      }
    }

    // Check warehouse count if changing type
    if (dto.type === BranchType.WAREHOUSE && branch.type !== BranchType.WAREHOUSE) {
      const warehouse = await this.branchRepository.findOne({
        where: { type: BranchType.WAREHOUSE },
      });
      if (warehouse) {
        throw new ConflictException('A central warehouse already exists in the system');
      }
    }

    // Apply updates
    Object.assign(branch, dto);
    const updated = await this.branchRepository.save(branch);

    // Audit log
    await this.auditLogRepository.save({
      userId,
      action: 'BRANCH_UPDATED',
      entityType: 'Branch',
      entityId: id,
      beforeJson: beforeState,
      afterJson: updated,
      ipAddress,
    });

    // SSE
    this.notificationsService.triggerRefresh('branch_changed');

    return updated;
  }
}
