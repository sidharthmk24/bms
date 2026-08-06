import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSuperAdminDashboard() {
    const [stats] = await this.dataSource.manager.query(`
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
    const [stats] = await this.dataSource.manager.query(`
      SELECT 
        (SELECT COUNT(*) FROM central_stock WHERE quantity <= reorder_threshold) as lowStockCount,
        (SELECT COUNT(*) FROM restock_request WHERE status = 'PENDING') as pendingRestocks,
        (SELECT COUNT(*) FROM purchase_order WHERE status = 'PLACED') as activePurchaseOrders,
        (SELECT COUNT(*) FROM new_title_request WHERE status = 'PENDING') as pendingNewTitles
    `);
    return {
      lowStockCount: Number(stats.lowStockCount || 0),
      pendingRestocks: Number(stats.pendingRestocks || 0),
      activePurchaseOrders: Number(stats.activePurchaseOrders || 0),
      pendingNewTitles: Number(stats.pendingNewTitles || 0),
    };
  }

  async getFinanceDashboard(days: number = 30) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    const [stats] = await this.dataSource.manager.query(`
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

    const rawRevenues = await this.dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [startDateStr]);

    const rawExpenses = await this.dataSource.manager.query(`
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
      profit: data.revenue - data.cogs - data.expense
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
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const [stats] = await this.dataSource.manager.query(`
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

    const rawRevenues = await this.dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [user.branchId, startDateStr]);

    const rawExpenses = await this.dataSource.manager.query(`
      SELECT expense_date as date, SUM(amount) as expense
      FROM expense 
      WHERE branch_id = ? AND expense_date >= ?
      GROUP BY expense_date
    `, [user.branchId, startDateStr]);

    // Map by date
    // Map by date
    const trendMap = new Map<string, { revenue: number, expense: number, cogs: number }>();
    
    // Fill the last N days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { revenue: 0, expense: 0, cogs: 0 });
    }

    rawRevenues.forEach((r: any) => {
      // r.date might be a Date object instead of a string
      const dateObj = typeof r.date === 'string' ? new Date(r.date) : r.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) {
        trendMap.get(d)!.revenue = Number(r.revenue);
        trendMap.get(d)!.cogs = Number(r.cogs || 0);
      }
    });

    rawExpenses.forEach((e: any) => {
      // e.date might be a Date object instead of a string
      const dateObj = typeof e.date === 'string' ? new Date(e.date) : e.date;
      const d = dateObj.toISOString().split('T')[0];
      if (trendMap.has(d)) trendMap.get(d)!.expense = Number(e.expense);
    });

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expense: data.expense,
      cogs: data.cogs,
      profit: data.revenue - data.cogs - data.expense
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
    // Generate historical trend data for the last N days
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const startDateStr = pastDate.toISOString().split('T')[0];

    const rawRevenues = await this.dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [branchId, startDateStr]);

    const rawExpenses = await this.dataSource.manager.query(`
      SELECT expense_date as date, SUM(amount) as expense
      FROM expense 
      WHERE branch_id = ? AND expense_date >= ?
      GROUP BY expense_date
    `, [branchId, startDateStr]);

    // Map by date
    // Map by date
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
      profit: data.revenue - data.cogs - data.expense
    }));

    return { trendData };
  }

  async getCombinedTrendForSuperAdmin(days: number = 30) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const startDateStr = pastDate.toISOString().split('T')[0];

    const rawRevenues = await this.dataSource.manager.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cost) as cogs
      FROM bill 
      WHERE status = 'COMPLETED' AND DATE(created_at) >= ?
      GROUP BY DATE(created_at)
    `, [startDateStr]);

    const rawExpenses = await this.dataSource.manager.query(`
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
      profit: data.revenue - data.cogs - data.expense
    }));

    return { trendData };
  }

  async getBranchInventoryDashboard(user: JwtPayload) {
    const [stats] = await this.dataSource.manager.query(`
      SELECT 
        (SELECT COUNT(*) FROM branch_inventory WHERE branch_id = ? AND quantity <= reorder_threshold) as lowStockCount,
        (SELECT COUNT(*) FROM restock_request WHERE branch_id = ? AND status = 'PENDING') as pendingRestocks,
        (SELECT COUNT(*) FROM exhibition WHERE source_branch_id = ? AND status = 'ONGOING') as activeExhibitions
    `, [user.branchId, user.branchId, user.branchId]);

    return {
      lowStockCount: Number(stats.lowStockCount || 0),
      pendingRestocks: Number(stats.pendingRestocks || 0),
      activeExhibitions: Number(stats.activeExhibitions || 0),
    };
  }

  async getBranchFrontOfficeDashboard(user: JwtPayload) {
    const todayStr = new Date().toISOString().split('T')[0];

    const [stats] = await this.dataSource.manager.query(`
      SELECT 
        (SELECT SUM(total_amount) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND DATE(created_at) = ?) as todaySales,
        (SELECT SUM(total_amount) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND payment_mode = 'CASH' AND DATE(created_at) = ?) as cashSales,
        (SELECT SUM(total_amount) FROM bill WHERE branch_id = ? AND status = 'COMPLETED' AND payment_mode = 'UPI' AND DATE(created_at) = ?) as upiSales,
        (SELECT COUNT(*) FROM bill WHERE branch_id = ? AND payment_status = 'UNPAID') as unpaidBills,
        (SELECT COUNT(*) FROM book_enquiry WHERE branch_id = ? AND status = 'OPEN') as openEnquiries,
        (SELECT COUNT(*) FROM book_enquiry WHERE branch_id = ? AND DATE(created_at) = ?) as enquiriesToday
    `, [user.branchId, todayStr, user.branchId, todayStr, user.branchId, todayStr, user.branchId, user.branchId, user.branchId, todayStr]);

    return {
      todaySales: Number(stats.todaySales || 0),
      cashSales: Number(stats.cashSales || 0),
      upiSales: Number(stats.upiSales || 0),
      unpaidBills: Number(stats.unpaidBills || 0),
      openEnquiries: Number(stats.openEnquiries || 0),
      enquiriesToday: Number(stats.enquiriesToday || 0),
    };
  }
}
