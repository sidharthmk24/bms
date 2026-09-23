import 'server-only';
import { getDataSource } from '../db/data-source';
import { JwtPayload } from '../auth/jwt';

export class DashboardService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
    };
  }

  async getSuperAdminDashboard() {
    const { dataSource } = await this.getRepos();
    const [stats] = await dataSource.manager.query(`
      SELECT 
        (SELECT COUNT(*) FROM branch) as branchCount,
        (SELECT COUNT(*) FROM user WHERE is_active = 1) as activeUsersCount,
        (SELECT SUM(total_amount) FROM bill WHERE status = 'COMPLETED') as totalRevenue,
        (SELECT COUNT(*) FROM exhibition WHERE status = 'ONGOING') as activeExhibitions
    `);
    return {
      branchCount: Number(stats.branchCount || 0),
      activeUsersCount: Number(stats.activeUsersCount || 0),
      totalRevenue: Number(stats.totalRevenue || 0),
      activeExhibitions: Number(stats.activeExhibitions || 0),
    };
  }

  async getAdminDashboard() {
    return this.getSuperAdminDashboard();
  }

  async getCentralInventoryDashboard() {
    const { dataSource } = await this.getRepos();
    const [stats] = await dataSource.manager.query(`
      SELECT 
        (SELECT COUNT(*) FROM central_stock WHERE quantity <= reorder_threshold) as lowStockCount,
        (SELECT COUNT(*) FROM restock_request WHERE status = 'PENDING') as pendingRestocks,
        (SELECT COUNT(*) FROM purchase_order WHERE status = 'PLACED') as activePurchaseOrders,
        (SELECT COUNT(*) FROM new_title_request WHERE status = 'PENDING') as pendingNewTitles,
        (SELECT IFNULL(SUM(quantity), 0) FROM central_stock) as totalCentralStockUnits,
        (SELECT COUNT(*) FROM book WHERE is_active = 1) as totalCatalogTitles
    `);

    const lowStockItemsList = await dataSource.manager.query(`
      SELECT cs.quantity, cs.reorder_threshold as reorderThreshold, b.id as bookId, b.title, b.isbn
      FROM central_stock cs
      JOIN book b ON cs.book_id = b.id
      WHERE cs.quantity <= cs.reorder_threshold
      ORDER BY cs.quantity ASC
      LIMIT 5
    `).catch(() => []);

    const recentPurchaseOrdersList = await dataSource.manager.query(`
      SELECT po.id, po.order_number as orderNumber, po.status, po.total_cost as totalCost, po.created_at as createdAt, s.name as supplierName
      FROM purchase_order po
      LEFT JOIN supplier s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
      LIMIT 4
    `).catch(() => []);

    const pendingRestockRequestsList = await dataSource.manager.query(`
      SELECT rr.id, rr.request_number as requestNumber, rr.status, rr.created_at as createdAt, br.name as branchName
      FROM restock_request rr
      LEFT JOIN branch br ON rr.branch_id = br.id
      WHERE rr.status = 'PENDING'
      ORDER BY rr.created_at DESC
      LIMIT 4
    `).catch(() => []);

    return {
      lowStockCount: Number(stats.lowStockCount || 0),
      pendingRestocks: Number(stats.pendingRestocks || 0),
      activePurchaseOrders: Number(stats.activePurchaseOrders || 0),
      pendingNewTitles: Number(stats.pendingNewTitles || 0),
      totalCentralStockUnits: Number(stats.totalCentralStockUnits || 0),
      totalCatalogTitles: Number(stats.totalCatalogTitles || 0),
      lowStockItemsList,
      recentPurchaseOrdersList,
      pendingRestockRequestsList,
    };
  }

  async getFinanceDashboard(days: number = 30) {
    const { dataSource } = await this.getRepos();
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    const [stats] = await dataSource.manager.query(`
      SELECT 
        (SELECT SUM(total_amount) FROM bill WHERE status = 'COMPLETED' AND DATE(created_at) >= ?) as mtdRevenue,
        (SELECT SUM(total_cost) FROM bill WHERE status = 'COMPLETED' AND DATE(created_at) >= ?) as mtdCogs,
        (SELECT SUM(amount) FROM expense WHERE expense_date >= ?) as mtdExpense,
        (SELECT COUNT(*) FROM cash_reconciliation WHERE variance != 0 AND reconciliation_date >= ?) as discrepancies
    `, [startOfMonth, startOfMonth, startOfMonth, startOfMonth]);

    // Generate historical trend data for the last N days
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const startDateStr = pastDate.toISOString().split('T')[0];

    const rawRevenues = await dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [startDateStr]);

    const rawExpenses = await dataSource.manager.query(`
      SELECT expense_date as date, SUM(amount) as expense
      FROM expense 
      WHERE expense_date >= ?
      GROUP BY expense_date
    `, [startDateStr]);

    const trendMap = new Map<string, { revenue: number, expense: number, cogs: number }>();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { revenue: 0, expense: 0, cogs: 0 });
    }

    rawRevenues.forEach((r: any) => {
      const dateObj = typeof r.date === 'string' ? new Date(r.date) : r.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) {
        trendMap.get(d)!.revenue = Number(r.revenue);
        trendMap.get(d)!.cogs = Number(r.cogs || 0);
      }
    });

    rawExpenses.forEach((e: any) => {
      const dateObj = typeof e.date === 'string' ? new Date(e.date) : e.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) trendMap.get(d)!.expense = Number(e.expense);
    });

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expense: data.expense,
      cogs: data.cogs,
      profit: data.revenue
    }));

    return {
      mtdRevenue: Number(stats.mtdRevenue || 0),
      mtdExpense: Number(stats.mtdExpense || 0),
      mtdProfit: Number(stats.mtdRevenue || 0) - Number(stats.mtdCogs || 0) - Number(stats.mtdExpense || 0),
      discrepancies: Number(stats.discrepancies || 0),
      trendData,
    };
  }

  async getBranchManagerDashboard(user: JwtPayload, days: number = 30) {
    const { dataSource } = await this.getRepos();
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const [stats] = await dataSource.manager.query(`
      SELECT 
        (SELECT SUM(total_amount) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?) as mtdRevenue,
        (SELECT SUM(total_cost) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?) as mtdCogs,
        (SELECT SUM(amount) FROM expense WHERE branch_id = ? AND expense_date >= ?) as mtdExpense,
        (SELECT COUNT(*) FROM branch_inventory WHERE branch_id = ? AND quantity <= reorder_threshold) as lowStockCount,
        (SELECT COUNT(*) FROM restock_request WHERE branch_id = ? AND status = 'PENDING') as pendingRestocks
    `, [user.branchId, startOfMonth, user.branchId, startOfMonth, user.branchId, startOfMonth, user.branchId, user.branchId]);

    // Generate historical trend data for the last N days
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const startDateStr = pastDate.toISOString().split('T')[0];

    const rawRevenues = await dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [user.branchId, startDateStr]);

    const rawExpenses = await dataSource.manager.query(`
      SELECT expense_date as date, SUM(amount) as expense
      FROM expense 
      WHERE branch_id = ? AND expense_date >= ?
      GROUP BY expense_date
    `, [user.branchId, startDateStr]);

    const trendMap = new Map<string, { revenue: number, expense: number, cogs: number }>();
    
    // Fill the last N days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { revenue: 0, expense: 0, cogs: 0 });
    }

    rawRevenues.forEach((r: any) => {
      const dateObj = typeof r.date === 'string' ? new Date(r.date) : r.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) {
        trendMap.get(d)!.revenue = Number(r.revenue);
        trendMap.get(d)!.cogs = Number(r.cogs || 0);
      }
    });

    rawExpenses.forEach((e: any) => {
      const dateObj = typeof e.date === 'string' ? new Date(e.date) : e.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) trendMap.get(d)!.expense = Number(e.expense);
    });

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expense: data.expense,
      cogs: data.cogs,
      profit: data.revenue
    }));

    return {
      mtdRevenue: Number(stats.mtdRevenue || 0),
      mtdExpense: Number(stats.mtdExpense || 0),
      lowStockCount: Number(stats.lowStockCount || 0),
      pendingRestocks: Number(stats.pendingRestocks || 0),
      trendData,
    };
  }

  async getBranchTrendForSuperAdmin(branchId: string, days: number = 30) {
    const { dataSource } = await this.getRepos();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const startDateStr = pastDate.toISOString().split('T')[0];

    const rawRevenues = await dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [branchId, startDateStr]);

    const rawExpenses = await dataSource.manager.query(`
      SELECT expense_date as date, SUM(amount) as expense
      FROM expense 
      WHERE branch_id = ? AND expense_date >= ?
      GROUP BY expense_date
    `, [branchId, startDateStr]);

    const trendMap = new Map<string, { revenue: number, expense: number, cogs: number }>();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { revenue: 0, expense: 0, cogs: 0 });
    }

    rawRevenues.forEach((r: any) => {
      const dateObj = typeof r.date === 'string' ? new Date(r.date) : r.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) {
        trendMap.get(d)!.revenue = Number(r.revenue);
        trendMap.get(d)!.cogs = Number(r.cogs || 0);
      }
    });

    rawExpenses.forEach((e: any) => {
      const dateObj = typeof e.date === 'string' ? new Date(e.date) : e.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) trendMap.get(d)!.expense = Number(e.expense);
    });

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expense: data.expense,
      cogs: data.cogs,
      profit: data.revenue
    }));

    return { trendData };
  }

  async getCombinedTrendForSuperAdmin(days: number = 30) {
    const { dataSource } = await this.getRepos();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const startDateStr = pastDate.toISOString().split('T')[0];

    const rawRevenues = await dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [startDateStr]);

    const rawExpenses = await dataSource.manager.query(`
      SELECT expense_date as date, SUM(amount) as expense
      FROM expense 
      WHERE expense_date >= ?
      GROUP BY expense_date
    `, [startDateStr]);

    const trendMap = new Map<string, { revenue: number, expense: number, cogs: number }>();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { revenue: 0, expense: 0, cogs: 0 });
    }

    rawRevenues.forEach((r: any) => {
      const dateObj = typeof r.date === 'string' ? new Date(r.date) : r.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) {
        trendMap.get(d)!.revenue = Number(r.revenue);
        trendMap.get(d)!.cogs = Number(r.cogs || 0);
      }
    });

    rawExpenses.forEach((e: any) => {
      const dateObj = typeof e.date === 'string' ? new Date(e.date) : e.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) trendMap.get(d)!.expense = Number(e.expense);
    });

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expense: data.expense,
      cogs: data.cogs,
      profit: data.revenue
    }));

    return { trendData };
  }

  async getBranchInventoryDashboard(user: JwtPayload) {
    const { dataSource } = await this.getRepos();
    const [stats] = await dataSource.manager.query(`
      SELECT 
        (SELECT COUNT(*) FROM branch_inventory WHERE branch_id = ? AND quantity <= reorder_threshold) as lowStockCount,
        (SELECT COUNT(*) FROM restock_request WHERE branch_id = ? AND status = 'PENDING') as pendingRestocks,
        (SELECT COUNT(*) FROM restock_request WHERE branch_id = ? AND status = 'FULFILLED') as awaitingReceipt,
        (SELECT COUNT(*) FROM exhibition WHERE source_branch_id = ? AND status = 'ONGOING') as exhibitionsOut,
        (SELECT IFNULL(SUM(quantity), 0) FROM branch_inventory WHERE branch_id = ?) as totalBranchStockUnits
    `, [user.branchId, user.branchId, user.branchId, user.branchId, user.branchId]);

    const lowStockItemsList = await dataSource.manager.query(`
      SELECT bi.quantity, bi.reorder_threshold as reorderThreshold, b.id as bookId, b.title, b.isbn
      FROM branch_inventory bi
      JOIN book b ON bi.book_id = b.id
      WHERE bi.branch_id = ? AND bi.quantity <= bi.reorder_threshold
      ORDER BY bi.quantity ASC
      LIMIT 5
    `, [user.branchId]).catch(() => []);

    const recentRestockRequestsList = await dataSource.manager.query(`
      SELECT rr.id, rr.request_number as requestNumber, rr.status, rr.created_at as createdAt
      FROM restock_request rr
      WHERE rr.branch_id = ?
      ORDER BY rr.created_at DESC
      LIMIT 5
    `, [user.branchId]).catch(() => []);

    const ongoingExhibitionsList = await dataSource.manager.query(`
      SELECT ex.id, ex.name, ex.location, ex.status, ex.start_date as startDate, ex.end_date as endDate
      FROM exhibition ex
      WHERE ex.source_branch_id = ? AND ex.status = 'ONGOING'
      ORDER BY ex.created_at DESC
      LIMIT 3
    `, [user.branchId]).catch(() => []);

    return {
      lowStockCount: Number(stats.lowStockCount || 0),
      pendingRestocks: Number(stats.pendingRestocks || 0),
      awaitingReceipt: Number(stats.awaitingReceipt || 0),
      exhibitionsOut: Number(stats.exhibitionsOut || 0),
      totalBranchStockUnits: Number(stats.totalBranchStockUnits || 0),
      lowStockItemsList,
      recentRestockRequestsList,
      ongoingExhibitionsList,
    };
  }

  async getBranchFrontOfficeDashboard(user: JwtPayload) {
    const { dataSource } = await this.getRepos();

    const [stats] = await dataSource.manager.query(`
      SELECT 
        (SELECT IFNULL(SUM(total_amount), 0) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) = CURDATE()) as todaySales,
        (SELECT IFNULL(SUM(total_amount), 0) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND payment_mode = 'CASH' AND DATE(created_at) = CURDATE()) as cashSales,
        (SELECT IFNULL(SUM(total_amount), 0) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND payment_mode = 'UPI' AND DATE(created_at) = CURDATE()) as upiSales,
        (SELECT COUNT(*) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) = CURDATE()) as todayBillCount,
        (SELECT COUNT(*) FROM bill WHERE branch_id = ? AND payment_status = 'UNPAID') as unpaidBills,
        (SELECT COUNT(*) FROM book_enquiry WHERE branch_id = ? AND status = 'OPEN') as openEnquiries,
        (SELECT COUNT(*) FROM book_enquiry WHERE branch_id = ? AND DATE(created_at) = CURDATE()) as enquiriesToday
    `, [user.branchId, user.branchId, user.branchId, user.branchId, user.branchId, user.branchId, user.branchId]);

    const recentTransactionsList = await dataSource.manager.query(`
      SELECT b.id, b.bill_number as billNumber, b.customer_name as customerName, b.total_amount as totalAmount, b.payment_mode as paymentMode, b.payment_status as paymentStatus, b.created_at as createdAt
      FROM bill b
      WHERE b.branch_id = ? AND DATE(b.created_at) = CURDATE()
      ORDER BY b.created_at DESC
      LIMIT 5
    `, [user.branchId]).catch(() => []);

    const openEnquiriesList = await dataSource.manager.query(`
      SELECT e.id, e.customer_name as customerName, e.customer_phone as customerPhone, e.free_text_title as freeTextTitle, e.created_at as createdAt, b.title as bookTitle
      FROM book_enquiry e
      LEFT JOIN book b ON e.book_id = b.id
      WHERE e.branch_id = ? AND e.status = 'OPEN'
      ORDER BY e.created_at DESC
      LIMIT 5
    `, [user.branchId]).catch(() => []);

    return {
      todaySales: Number(stats.todaySales || 0),
      cashSales: Number(stats.cashSales || 0),
      upiSales: Number(stats.upiSales || 0),
      todayBillCount: Number(stats.todayBillCount || 0),
      unpaidBills: Number(stats.unpaidBills || 0),
      openEnquiries: Number(stats.openEnquiries || 0),
      enquiriesToday: Number(stats.enquiriesToday || 0),
      recentTransactionsList,
      openEnquiriesList,
    };
  }
}
