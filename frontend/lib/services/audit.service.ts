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

  async findAll(limit: number = 100): Promise<AuditLog[]> {
    const { auditRepo } = await this.getRepos();
    return auditRepo.find({
      relations: ['user', 'user.branch'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
