import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Header,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { CreateCashReconciliationDto } from './dto/cash-reconciliation.dto';

@ApiTags('Finance')
@ApiBearerAuth('JWT')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Expenses ──────────────────────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER)
  @Post('expenses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create manual expense' })
  async createExpense(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.financeService.createExpense(dto, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER)
  @Get('expenses')
  @ApiOperation({ summary: 'List expenses (branch managers see own only)' })
  async findAllExpenses(@CurrentUser() user: JwtPayload) {
    return this.financeService.findAllExpenses(user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER)
  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Update expense (writes a revision)' })
  async updateExpense(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.financeService.updateExpense(id, dto, user, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER)
  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Delete expense' })
  async deleteExpense(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.financeService.deleteExpense(id, user, ip);
  }

  // ── Cash Reconciliation ───────────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE)
  @Post('cash-reconciliation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create daily cash reconciliation' })
  async createCashReconciliation(@CurrentUser() user: JwtPayload, @Body() dto: CreateCashReconciliationDto) {
    return this.financeService.createCashReconciliation(dto, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE)
  @Get('cash-reconciliation')
  @ApiOperation({ summary: 'List cash reconciliations' })
  async findAllCashReconciliations(@CurrentUser() user: JwtPayload) {
    return this.financeService.findAllCashReconciliations(user);
  }

  // ── Reports ───────────────────────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER)
  @Get('revenue')
  @ApiOperation({ summary: 'Revenue grouped by day, branch, payment mode' })
  async getRevenue(
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getRevenue(user, startDate, endDate);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  @Get('pnl')
  @ApiOperation({ summary: 'P&L report (Chain-wide)' })
  async getPnL(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.financeService.getPnL(startDate, endDate);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  @Get('branch-comparison')
  @ApiOperation({ summary: 'Branch Comparison (Revenue vs Expenses)' })
  async getBranchComparison(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.financeService.getBranchComparison(startDate, endDate);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  @Get('export')
  @ApiOperation({ summary: 'Export expenses to CSV' })
  async exportFinanceData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: any,
  ) {
    const csv = await this.financeService.exportFinanceData(startDate, endDate);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=expenses_export.csv');
    return res.send(csv);
  }
}
