import { Controller, Get, ForbiddenException, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get('super-admin')
  @ApiOperation({ summary: 'Super Admin Dashboard' })
  async getSuperAdmin() {
    return this.dashboardService.getSuperAdminDashboard();
  }

  @Get('super-admin/combined-trend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get combined trend data for all branches' })
  async getCombinedTrendForSuperAdmin(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getCombinedTrendForSuperAdmin(d);
  }

  @Get('super-admin/branch-trend/:branchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get branch trend data for global admins' })
  async getBranchTrendForSuperAdmin(@Param('branchId') branchId: string, @Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getBranchTrendForSuperAdmin(branchId, d);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Admin Dashboard' })
  async getAdmin() {
    return this.dashboardService.getAdminDashboard();
  }

  @Roles(UserRole.CENTRAL_INVENTORY_MANAGER)
  @Get('central-inventory')
  @ApiOperation({ summary: 'Central Inventory Dashboard' })
  async getCentralInventory() {
    return this.dashboardService.getCentralInventoryDashboard();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  @Get('finance')
  @ApiOperation({ summary: 'Finance Dashboard' })
  async getFinance(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getFinanceDashboard(d);
  }

  @Roles(UserRole.BRANCH_MANAGER)
  @Get('branch-manager')
  @ApiOperation({ summary: 'Branch Manager Dashboard' })
  async getBranchManager(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    if (!user.branchId) throw new ForbiddenException('Branch context required');
    const d = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getBranchManagerDashboard(user, d);
  }

  @Roles(UserRole.BRANCH_INVENTORY)
  @Get('branch-inventory')
  @ApiOperation({ summary: 'Branch Inventory Dashboard' })
  async getBranchInventory(@CurrentUser() user: JwtPayload) {
    if (!user.branchId) throw new ForbiddenException('Branch context required');
    return this.dashboardService.getBranchInventoryDashboard(user);
  }

  @Roles(UserRole.BRANCH_FRONT_OFFICE)
  @Get('branch-front-office')
  @ApiOperation({ summary: 'Branch Front Office Dashboard' })
  async getBranchFrontOffice(@CurrentUser() user: JwtPayload) {
    if (!user.branchId) throw new ForbiddenException('Branch context required');
    return this.dashboardService.getBranchFrontOfficeDashboard(user);
  }
}
