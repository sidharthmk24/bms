import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { CreateBranchInventoryDto } from './dto/create-branch-inventory.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetInventoryQueryDto } from './dto/get-inventory-query.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';

@ApiTags('Inventory')
@ApiBearerAuth('JWT')
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── CENTRAL WAREHOUSE STOCK ───────────────────────────────────────────────

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Get('central-stock')
  @ApiOperation({ summary: 'List all items in the central warehouse stock (chain managers only)' })
  async getCentralStock(@Query() query: GetInventoryQueryDto) {
    return this.inventoryService.getCentralStock(query);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Get('central-stock/low')
  @ApiOperation({ summary: 'List low-stock items in central warehouse (below threshold)' })
  async getCentralStockLow(@Query() query: GetInventoryQueryDto) {
    return this.inventoryService.getCentralStockLow(query);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch('central-stock/:bookId/threshold')
  @ApiOperation({ summary: 'Update central reorder threshold for a book' })
  async updateCentralThreshold(
    @Req() req: Request,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateThresholdDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.inventoryService.updateCentralThreshold(bookId, dto, user, ip);
  }

  // ─── BRANCH INVENTORY ──────────────────────────────────────────────────────

  @Get('branches/:branchId/inventory')
  @ApiOperation({
    summary: 'List items in a specific branch inventory',
    description: 'Branch managers see only their branch. Chain managers can query any branch.',
  })
  async getBranchInventory(
    @Param('branchId') branchId: string,
    @Query() query: GetInventoryQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.getBranchInventory(branchId, query, user);
  }

  @Get('branches/:branchId/inventory/low')
  @ApiOperation({ summary: 'List low-stock items in a specific branch (below threshold)' })
  async getBranchInventoryLow(
    @Param('branchId') branchId: string,
    @Query() query: GetInventoryQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.getBranchInventoryLow(branchId, query, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Post('branches/:branchId/inventory')
  @ApiOperation({
    summary: 'Register a book in a branch inventory',
    description: 'Registers a catalog book to a store with an optional opening quantity.',
  })
  async addBranchInventory(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Body() dto: CreateBranchInventoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.inventoryService.addBranchInventory(branchId, dto, user, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Patch('branches/:branchId/inventory/:bookId/threshold')
  @ApiOperation({ summary: 'Update branch reorder threshold for a book' })
  async updateBranchThreshold(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateThresholdDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.inventoryService.updateBranchThreshold(branchId, bookId, dto, user, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Post('branches/:branchId/inventory/:bookId/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually adjust branch stock quantity (shrinkage, damaged, samples)',
    description: 'Updates branch quantity atomically and appends a StockMovement record. Cannot result in negative stock.',
  })
  async adjustBranchStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('bookId') bookId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.inventoryService.adjustBranchStock(branchId, bookId, dto, user, ip);
  }

  // ─── STOCK MOVEMENTS LEDGER ────────────────────────────────────────────────

  @Get('stock-movements')
  @ApiOperation({ summary: 'View permanent append-only stock movements ledger' })
  async getStockMovements(@Query() query: GetMovementsQueryDto) {
    return this.inventoryService.getStockMovements(query);
  }
}
