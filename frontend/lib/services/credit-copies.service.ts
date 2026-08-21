import 'server-only';
import { getDataSource } from '../db/data-source';
import { CreditCopy } from '../api-backend/credit-copies/entities/credit-copy.entity';
import { JwtPayload } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import { writeStockMovement, decrementBranchStock, decrementCentralStock } from './stock.helper';
import { ForbiddenException, BadRequestException } from '../errors';

export class CreditCopiesService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      creditCopyRepo: ds.getRepository(CreditCopy),
    };
  }

  async findAll(user: JwtPayload): Promise<CreditCopy[]> {
    const { creditCopyRepo } = await this.getRepos();
    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN) || hasRole(user, UserRole.FINANCE);

    const qb = creditCopyRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.book', 'book')
      .leftJoinAndSelect('cc.branch', 'branch')
      .leftJoinAndSelect('cc.issuedBy', 'issuedBy')
      .orderBy('cc.createdAt', 'DESC');

    if (!isAdmin) {
      if (!user.branchId) return [];
      qb.where('cc.branchId = :branchId', { branchId: user.branchId });
    }

    return qb.getMany();
  }

  async issueCreditCopy(
    bookId: string,
    quantity: number,
    recipientName: string,
    note: string | undefined,
    user: JwtPayload,
    branchId: string | undefined,
    ipAddress: string
  ): Promise<CreditCopy> {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than 0');

    // Only allow assigning to central if admin
    const targetBranchId = branchId || user.branchId;
    const isCentral = !targetBranchId;
    
    if (isCentral && !hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN)) {
      throw new ForbiddenException('Only administrators can issue central credit copies');
    }

    if (targetBranchId && !hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN) && user.branchId !== targetBranchId) {
      throw new ForbiddenException('Cannot issue credit copies for another branch');
    }

    const { dataSource, creditCopyRepo } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Decrement stock
      if (isCentral) {
        await decrementCentralStock(queryRunner, bookId, quantity);
      } else {
        await decrementBranchStock(queryRunner, targetBranchId!, bookId, quantity);
      }

      // 2. Write stock movement
      await writeStockMovement(queryRunner, {
        bookId,
        branchId: targetBranchId || null,
        type: 'CREDIT_OUT',
        quantity: -quantity,
        performedById: user.userId,
        referenceType: 'MANUAL',
        note: `Credit Copy to: ${recipientName}`,
      });

      // 3. Log credit copy
      const creditCopy = creditCopyRepo.create({
        bookId,
        branchId: targetBranchId || null,
        quantity,
        recipientName,
        note: note || null,
        issuedById: user.userId,
      });
      const saved = await queryRunner.manager.getRepository(CreditCopy).save(creditCopy);

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,NULL,?,?,DEFAULT)',
        [user.userId, 'CREDIT_COPY_ISSUED', 'CreditCopy', saved.id, JSON.stringify(saved), ipAddress]
      );

      await queryRunner.commitTransaction();
      return JSON.parse(JSON.stringify(saved));
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
