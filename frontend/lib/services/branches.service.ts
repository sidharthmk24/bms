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
      dataSource: ds,
      branchRepo: ds.getRepository(Branch),
      auditRepo: ds.getRepository(AuditLog),
    };
  }

  async findAll(): Promise<Branch[]> {
    const { branchRepo } = await this.getRepos();
    
    // Ensure Central Warehouse exists
    const warehouse = await branchRepo.findOne({ where: { type: BranchType.WAREHOUSE } });
    if (!warehouse) {
      try {
        const newWarehouse = branchRepo.create({
          name: 'Central Warehouse',
          code: 'WH-01',
          type: BranchType.WAREHOUSE,
          address: 'Central Warehouse Location',
          city: 'Central',
          phone: '0000000000',
          isActive: true,
        });
        await branchRepo.save(newWarehouse);
      } catch (err) {
        console.error('Failed to auto-create Central Warehouse:', err);
      }
    }

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

  async findAllWithStats(): Promise<any[]> {
    const { branchRepo, dataSource } = await this.getRepos();
    const branches = await this.findAll();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const enhancedBranches = await Promise.all(
      branches.map(async (b) => {
        try {
          const isWarehouse = b.type === BranchType.WAREHOUSE;

          // Staff stats
          const [staffInfo] = await dataSource.manager.query(`
            SELECT 
              COUNT(*) as staffCount,
              (SELECT name FROM user WHERE branch_id = ? AND primary_role = 'BRANCH_MANAGER' AND is_active = 1 LIMIT 1) as managerName
            FROM user 
            WHERE branch_id = ? AND is_active = 1
          `, [b.id, b.id]);

          // Stock stats
          let stockStats: any = {};
          if (isWarehouse) {
            const [cs] = await dataSource.manager.query(`
              SELECT 
                COALESCE(SUM(quantity), 0) as totalStockQty,
                COALESCE(COUNT(DISTINCT book_id), 0) as uniqueTitlesCount,
                COALESCE(SUM(CASE WHEN quantity <= reorder_threshold THEN 1 ELSE 0 END), 0) as lowStockCount
              FROM central_stock
            `);
            stockStats = cs || {};
          } else {
            const [bi] = await dataSource.manager.query(`
              SELECT 
                COALESCE(SUM(quantity), 0) as totalStockQty,
                COALESCE(COUNT(DISTINCT book_id), 0) as uniqueTitlesCount,
                COALESCE(SUM(CASE WHEN quantity <= reorder_threshold THEN 1 ELSE 0 END), 0) as lowStockCount
              FROM branch_inventory
              WHERE branch_id = ?
            `, [b.id]);
            stockStats = bi || {};
          }

          // Sales stats
          const [salesStats] = await dataSource.manager.query(`
            SELECT 
              COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END), 0) as mtdRevenue,
              COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END), 0) as todayRevenue,
              COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN 1 ELSE 0 END), 0) as todayBillsCount
            FROM bill
            WHERE branch_id = ? AND status = 'COMPLETED'
          `, [startOfMonthStr, todayStr, todayStr, b.id]);

          return {
            ...b,
            staffCount: Number(staffInfo?.staffCount || 0),
            managerName: staffInfo?.managerName || null,
            totalStockQty: Number(stockStats?.totalStockQty || 0),
            uniqueTitlesCount: Number(stockStats?.uniqueTitlesCount || 0),
            lowStockCount: Number(stockStats?.lowStockCount || 0),
            mtdRevenue: Number(salesStats?.mtdRevenue || 0),
            todayRevenue: Number(salesStats?.todayRevenue || 0),
            todayBillsCount: Number(salesStats?.todayBillsCount || 0),
          };
        } catch (err) {
          console.error(`Error calculating stats for branch ${b.id}:`, err);
          return {
            ...b,
            staffCount: 0,
            managerName: null,
            totalStockQty: 0,
            uniqueTitlesCount: 0,
            lowStockCount: 0,
            mtdRevenue: 0,
            todayRevenue: 0,
            todayBillsCount: 0,
          };
        }
      })
    );

    return enhancedBranches;
  }

  async getBranchInsights(branchId: string, days: number = 30): Promise<any> {
    const { branchRepo, dataSource } = await this.getRepos();
    const branch = await this.findOne(branchId);
    const isWarehouse = branch.type === BranchType.WAREHOUSE;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfMonthStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    try {
      // 1. Financial summary
      const [financials] = await dataSource.manager.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END), 0) as mtdRevenue,
          COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total_cost ELSE 0 END), 0) as mtdCogs,
          COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END), 0) as todayRevenue,
          COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN 1 ELSE 0 END), 0) as todayBillsCount,
          COALESCE(COUNT(*), 0) as totalBillsCount,
          COALESCE(AVG(total_amount), 0) as avgBillValue
        FROM bill
        WHERE branch_id = ? AND status = 'COMPLETED'
      `, [startOfMonthStr, startOfMonthStr, todayStr, todayStr, branchId]);

      const [expenseStats] = await dataSource.manager.query(`
        SELECT COALESCE(SUM(amount), 0) as mtdExpense
        FROM expense
        WHERE branch_id = ? AND expense_date >= ?
      `, [branchId, startOfMonthStr]);

      const mtdRevenue = Number(financials?.mtdRevenue || 0);
      const mtdCogs = Number(financials?.mtdCogs || 0);
      const mtdExpense = Number(expenseStats?.mtdExpense || 0);
      const mtdProfit = mtdRevenue - mtdCogs - mtdExpense;

      // 2. Trend Data (past N days)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const rawDailySales = await dataSource.manager.query(`
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as revenue,
          COUNT(*) as count
        FROM bill
        WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?
        GROUP BY DATE(created_at)
      `, [branchId, pastDateStr]);

      const trendMap = new Map<string, { revenue: number; count: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        trendMap.set(dStr, { revenue: 0, count: 0 });
      }

      rawDailySales.forEach((r: any) => {
        const dateObj = typeof r.date === 'string' ? new Date(r.date) : r.date;
        const d = dateObj.toISOString().split('T')[0];
        if (trendMap.has(d)) {
          trendMap.get(d)!.revenue = Number(r.revenue);
          trendMap.get(d)!.count = Number(r.count);
        }
      });

      const salesTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        count: data.count,
      }));

      // 3. Inventory health
      let inventoryHealth: any = {};
      let topLowStockBooks: any[] = [];

      if (isWarehouse) {
        const [cs] = await dataSource.manager.query(`
          SELECT 
            COALESCE(SUM(cs.quantity), 0) as totalStockQty,
            COALESCE(COUNT(DISTINCT cs.book_id), 0) as uniqueTitlesCount,
            COALESCE(SUM(CASE WHEN cs.quantity <= cs.reorder_threshold THEN 1 ELSE 0 END), 0) as lowStockCount,
            COALESCE(SUM(CASE WHEN cs.quantity = 0 THEN 1 ELSE 0 END), 0) as outOfStockCount,
            COALESCE(SUM(cs.quantity * b.price), 0) as stockValue
          FROM central_stock cs
          JOIN book b ON cs.book_id = b.id
        `);
        inventoryHealth = cs || {};

        topLowStockBooks = await dataSource.manager.query(`
          SELECT 
            b.id as bookId,
            b.title,
            b.isbn,
            b.price,
            cs.quantity,
            cs.reorder_threshold as threshold
          FROM central_stock cs
          JOIN book b ON cs.book_id = b.id
          WHERE cs.quantity <= cs.reorder_threshold
          ORDER BY cs.quantity ASC
          LIMIT 6
        `);
      } else {
        const [bi] = await dataSource.manager.query(`
          SELECT 
            COALESCE(SUM(bi.quantity), 0) as totalStockQty,
            COALESCE(COUNT(DISTINCT bi.book_id), 0) as uniqueTitlesCount,
            COALESCE(SUM(CASE WHEN bi.quantity <= bi.reorder_threshold THEN 1 ELSE 0 END), 0) as lowStockCount,
            COALESCE(SUM(CASE WHEN bi.quantity = 0 THEN 1 ELSE 0 END), 0) as outOfStockCount,
            COALESCE(SUM(bi.quantity * b.price), 0) as stockValue
          FROM branch_inventory bi
          JOIN book b ON bi.book_id = b.id
          WHERE bi.branch_id = ?
        `, [branchId]);
        inventoryHealth = bi || {};

        topLowStockBooks = await dataSource.manager.query(`
          SELECT 
            b.id as bookId,
            b.title,
            b.isbn,
            b.price,
            bi.quantity,
            bi.reorder_threshold as threshold
          FROM branch_inventory bi
          JOIN book b ON bi.book_id = b.id
          WHERE bi.branch_id = ? AND bi.quantity <= bi.reorder_threshold
          ORDER BY bi.quantity ASC
          LIMIT 6
        `, [branchId]);
      }

      // 4. Staff members
      const staffList = await dataSource.manager.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.primary_role as primaryRole,
          u.is_active as isActive,
          u.created_at as createdAt
        FROM \`user\` u
        WHERE u.branch_id = ?
        ORDER BY u.is_active DESC, u.name ASC
      `, [branchId]);

      // 5. Recent 8 Completed Bills
      const recentBills = await dataSource.manager.query(`
        SELECT 
          b.id,
          b.bill_number as billNumber,
          b.total_amount as totalAmount,
          b.payment_mode as paymentMode,
          b.created_at as createdAt,
          u.name as cashierName
        FROM bill b
        LEFT JOIN \`user\` u ON b.created_by_id = u.id
        WHERE b.branch_id = ? AND b.status = 'COMPLETED'
        ORDER BY b.created_at DESC
        LIMIT 8
      `, [branchId]);

      // 6. Recent 6 Stock Transfers
      const recentTransfers = await dataSource.manager.query(`
        SELECT 
          st.id,
          st.transfer_number as transferNumber,
          st.status,
          st.created_at as createdAt,
          sb.name as sourceBranchName,
          tb.name as targetBranchName,
          (SELECT COALESCE(SUM(quantity_requested), 0) FROM stock_transfer_item WHERE transfer_id = st.id) as totalQty
        FROM stock_transfer st
        LEFT JOIN branch sb ON st.from_branch_id = sb.id
        LEFT JOIN branch tb ON st.to_branch_id = tb.id
        WHERE st.from_branch_id = ? OR st.to_branch_id = ?
        ORDER BY st.created_at DESC
        LIMIT 6
      `, [branchId, branchId]);

      return {
        branch,
        financials: {
          mtdRevenue,
          mtdCogs,
          mtdExpense,
          mtdProfit,
          todayRevenue: Number(financials?.todayRevenue || 0),
          todayBillsCount: Number(financials?.todayBillsCount || 0),
          totalBillsCount: Number(financials?.totalBillsCount || 0),
          avgBillValue: Number(financials?.avgBillValue || 0),
        },
        salesTrend,
        inventory: {
          totalStockQty: Number(inventoryHealth?.totalStockQty || 0),
          uniqueTitlesCount: Number(inventoryHealth?.uniqueTitlesCount || 0),
          lowStockCount: Number(inventoryHealth?.lowStockCount || 0),
          outOfStockCount: Number(inventoryHealth?.outOfStockCount || 0),
          stockValue: Number(inventoryHealth?.stockValue || 0),
        },
        topLowStockBooks,
        staff: staffList,
        recentBills,
        recentTransfers,
      };
    } catch (err) {
      console.error(`Error in getBranchInsights for branch ${branchId}:`, err);
      return {
        branch,
        financials: {
          mtdRevenue: 0,
          mtdCogs: 0,
          mtdExpense: 0,
          mtdProfit: 0,
          todayRevenue: 0,
          todayBillsCount: 0,
          totalBillsCount: 0,
          avgBillValue: 0,
        },
        salesTrend: [],
        inventory: {
          totalStockQty: 0,
          uniqueTitlesCount: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          stockValue: 0,
        },
        topLowStockBooks: [],
        staff: [],
        recentBills: [],
        recentTransfers: [],
      };
    }
  }
}

