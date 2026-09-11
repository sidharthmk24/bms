import 'server-only';
import { getDataSource } from '../db/data-source';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';

export class AuditService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      auditRepo: ds.getRepository(AuditLog),
    };
  }

  async findAll(query: any = {}): Promise<any> {
    const { auditRepo } = await this.getRepos();
    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10));
    const limitNum = Math.max(1, parseInt(String(query.limit || 20), 10));
    const skip = (pageNum - 1) * limitNum;

    const qb = auditRepo.createQueryBuilder('al')
      .leftJoinAndSelect('al.user', 'user')
      .leftJoinAndSelect('user.branch', 'branch')
      .orderBy('al.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum);

    if (query.search && String(query.search).trim()) {
      const searchStr = `%${String(query.search).trim()}%`;
      qb.andWhere(
        '(al.action LIKE :searchStr OR al.entityType LIKE :searchStr OR al.entityId LIKE :searchStr OR user.name LIKE :searchStr OR user.email LIKE :searchStr OR branch.name LIKE :searchStr OR al.ipAddress LIKE :searchStr)',
        { searchStr }
      );
    }

    if (query.branchId && query.branchId !== '__none__') {
      qb.andWhere('user.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.entityType && query.entityType !== '__none__') {
      if (Array.isArray(query.entityTypes) && query.entityTypes.length > 0) {
        qb.andWhere('al.entityType IN (:...entityTypes)', { entityTypes: query.entityTypes });
      } else {
        qb.andWhere('al.entityType = :entityType', { entityType: query.entityType });
      }
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}
