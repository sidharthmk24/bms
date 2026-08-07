import 'server-only';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '../errors';
import { getDataSource } from '../db/data-source';

import { Expense, ExpenseCategory } from '../api-backend/finance/entities/expense.entity';
import { ExpenseRevision } from '../api-backend/finance/entities/expense-revision.entity';
import { CashReconciliation } from '../api-backend/finance/entities/cash-reconciliation.entity';

import { CreateExpenseDto, UpdateExpenseDto } from '../api-backend/finance/dto/expense.dto';
import { CreateCashReconciliationDto } from '../api-backend/finance/dto/cash-reconciliation.dto';

import { JwtPayload } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';

export class FinanceService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      expenseRepo: ds.getRepository<Expense>("Expense"),
      expenseRevisionRepo: ds.getRepository<ExpenseRevision>("ExpenseRevision"),
      cashReconRepo: ds.getRepository<CashReconciliation>("CashReconciliation"),
    };
  }

  // ── Expenses ──────────────────────────────────────────────────────────────────
  async createExpense(dto: CreateExpenseDto, user: JwtPayload): Promise<Expense> {
    if (dto.amount === undefined || dto.amount === null) {
      throw new BadRequestException('Amount is required');
    }
    const { expenseRepo } = await this.getRepos();
    const expense = expenseRepo.create({
      ...dto,
      enteredById: user.userId,
    });
    return expenseRepo.save(expense);
  }

  async findAllExpenses(user: JwtPayload): Promise<Expense[]> {
    const { expenseRepo } = await this.getRepos();
    const qb = expenseRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.branch', 'branch')
      .leftJoinAndSelect('e.enteredBy', 'enteredBy')
      .orderBy('e.expenseDate', 'DESC')
      .addOrderBy('e.createdAt', 'DESC');

    if (hasRole(user, UserRole.BRANCH_MANAGER)) {
      qb.where('e.branch_id = :branchId', { branchId: user.branchId });
    }

    return qb.getMany();
  }

  async updateExpense(id: string, dto: UpdateExpenseDto, user: JwtPayload, ipAddress: string): Promise<Expense> {
    const { dataSource } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expense = await queryRunner.manager.findOne("Expense", { where: { id } }) as any;
      if (!expense) throw new NotFoundException(`Expense ${id} not found`);

      if (hasRole(user, UserRole.BRANCH_MANAGER) && expense.branchId !== user.branchId) {
        throw new ForbiddenException('Cannot edit expenses for other branches');
      }

      // Write revision
      const revision = queryRunner.manager.create("ExpenseRevision", {
        expenseId: id,
        previousAmount: expense.amount,
        previousDescription: expense.description,
        changedById: user.userId,
      }) as any;
      await queryRunner.manager.save("ExpenseRevision", revision);

      // Update expense
      expense.amount = dto.amount;
      expense.description = dto.description;
      const updated = await queryRunner.manager.save("Expense", expense) as any;

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXPENSE_UPDATED', 'Expense', id, JSON.stringify({ amount: revision.previousAmount, description: revision.previousDescription }), JSON.stringify(dto), ipAddress],
      );

      await queryRunner.commitTransaction();
      return updated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteExpense(id: string, user: JwtPayload, ipAddress: string): Promise<void> {
    const { expenseRepo, dataSource } = await this.getRepos();
    const expense = await expenseRepo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);

    if (hasRole(user, UserRole.BRANCH_MANAGER) && expense.branchId !== user.branchId) {
      throw new ForbiddenException('Cannot delete expenses for other branches');
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Manually cascade delete revisions to prevent foreign key constraint violations
      await queryRunner.manager.delete("ExpenseRevision", { expenseId: id });
      
      await queryRunner.manager.delete("Expense", id);

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXPENSE_DELETED', 'Expense', id, JSON.stringify(expense), null, ipAddress],
      );
      await queryRunner.commitTransaction();
    } catch(err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Cash Reconciliation ───────────────────────────────────────────────────────
  async createCashReconciliation(dto: CreateCashReconciliationDto, user: JwtPayload): Promise<CashReconciliation> {
    if (!user.branchId) throw new ForbiddenException('Branch context required');

    const { dataSource, cashReconRepo } = await this.getRepos();
    // 1. Calculate system cash total for this branch and date
    const [row] = await dataSource.manager.query(
      `SELECT SUM(total_amount) AS systemCashTotal
       FROM bill
       WHERE branch_id = ?
         AND payment_mode = 'CASH'
         AND status = 'COMPLETED'
         AND DATE(created_at) = ?`,
      [user.branchId, dto.reconciliationDate]
    );

    const systemTotal = Number(row?.systemCashTotal || 0);
    const countedTotal = dto.countedCashTotal;
    const variance = countedTotal - systemTotal;

    const recon = cashReconRepo.create({
      branchId: user.branchId,
      reconciliationDate: new Date(dto.reconciliationDate),
      systemCashTotal: systemTotal,
      countedCashTotal: countedTotal,
      variance: variance,
      note: dto.note ?? null,
      reconciledById: user.userId,
    });

    try {
      return await cashReconRepo.save(recon);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('Cash reconciliation already exists for this date');
      }
      throw err;
    }
  }

  async findAllCashReconciliations(user: JwtPayload): Promise<CashReconciliation[]> {
    const { cashReconRepo } = await this.getRepos();
    const qb = cashReconRepo
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.branch', 'branch')
      .leftJoinAndSelect('cr.reconciledBy', 'reconciledBy')
      .orderBy('cr.reconciliationDate', 'DESC');

    if (hasRole(user, UserRole.BRANCH_MANAGER) || hasRole(user, UserRole.BRANCH_FRONT_OFFICE)) {
      qb.where('cr.branch_id = :branchId', { branchId: user.branchId });
    }

    return qb.getMany();
  }

  // ── Reports ───────────────────────────────────────────────────────────────────
  async getRevenue(user: JwtPayload, startDate?: string, endDate?: string): Promise<any[]> {
    const { dataSource } = await this.getRepos();
    let query = `
      SELECT
        DATE(created_at) as date,
        branch_id as branchId,
        payment_mode as paymentMode,
        SUM(total_amount) as totalRevenue,
        COUNT(id) as billCount
      FROM bill
      WHERE status = 'COMPLETED'
    `;
    const params: any[] = [];

    if (hasRole(user, UserRole.BRANCH_MANAGER)) {
      query += ` AND branch_id = ?`;
      params.push(user.branchId);
    }
    if (startDate) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY DATE(created_at), branch_id, payment_mode ORDER BY date DESC`;
    return dataSource.manager.query(query, params);
  }

  async getPnL(startDate: string, endDate: string): Promise<any> {
    const { dataSource } = await this.getRepos();
    const [revenueRow] = await dataSource.manager.query(
      `SELECT SUM(total_amount) as totalRevenue FROM bill WHERE status = 'COMPLETED' AND DATE(created_at) BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [expenseRow] = await dataSource.manager.query(
      `SELECT SUM(amount) as totalExpense FROM expense WHERE expense_date BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const totalRevenue = Number(revenueRow?.totalRevenue || 0);
    const totalExpense = Number(expenseRow?.totalExpense || 0);

    return {
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
    };
  }

  async getBranchComparison(startDate: string, endDate: string): Promise<any[]> {
    const { dataSource } = await this.getRepos();
    const branches = await dataSource.manager.query(`SELECT id, name FROM branch`);
    
    const revenue = await dataSource.manager.query(
      `SELECT branch_id, SUM(total_amount) as total FROM bill WHERE status = 'COMPLETED' AND DATE(created_at) BETWEEN ? AND ? GROUP BY branch_id`,
      [startDate, endDate]
    );

    const expenses = await dataSource.manager.query(
      `SELECT branch_id, SUM(amount) as total FROM expense WHERE branch_id IS NOT NULL AND expense_date BETWEEN ? AND ? GROUP BY branch_id`,
      [startDate, endDate]
    );

    return branches.map((b: any) => {
      const rev = Number(revenue.find((r: any) => r.branch_id === b.id)?.total || 0);
      const exp = Number(expenses.find((e: any) => e.branch_id === b.id)?.total || 0);
      return {
        branchId: b.id,
        branchName: b.name,
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
      };
    }).sort((a: any, b: any) => b.profit - a.profit);
  }

  async exportFinanceData(startDate: string, endDate: string): Promise<string> {
    const { dataSource } = await this.getRepos();
    const expenses = await dataSource.manager.query(
      `SELECT e.expense_date, e.category, e.amount, e.description, b.name as branch_name
       FROM expense e
       LEFT JOIN branch b ON b.id = e.branch_id
       WHERE e.expense_date BETWEEN ? AND ?
       ORDER BY e.expense_date DESC`,
      [startDate, endDate]
    );

    if (expenses.length === 0) return 'Date,Category,Amount,Description,Branch\n';

    const headers = ['Date', 'Category', 'Amount', 'Description', 'Branch'];
    const rows = expenses.map((e: any) => [
      e.expense_date.toISOString().split('T')[0],
      e.category,
      e.amount,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.branch_name || 'CENTRAL'
    ]);

    return [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
  }
}
