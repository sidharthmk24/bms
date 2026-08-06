import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';

@ApiTags('Procurement')
@ApiBearerAuth('JWT')
@Controller('purchase-orders')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // ── Create a new DRAFT purchase order ────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CENTRAL_INVENTORY_MANAGER,
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new purchase order in DRAFT status',
    description: 'Creates a PO for a supplier with line items. Calculates totalCost automatically. Starts in DRAFT.',
  })
  async createOrder(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.procurementService.createOrder(dto, user, ip);
  }

  // ── List all purchase orders ──────────────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CENTRAL_INVENTORY_MANAGER,
    UserRole.FINANCE,
  )
  @Get()
  @ApiOperation({ summary: 'List all purchase orders (with supplier, items)' })
  async findAll() {
    return this.procurementService.findAll();
  }

  // ── Get single purchase order ─────────────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CENTRAL_INVENTORY_MANAGER,
    UserRole.FINANCE,
  )
  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific purchase order including line items and books' })
  async findOne(@Param('id') id: string) {
    return this.procurementService.findOne(id);
  }

  // ── Update PO status (PLACED / RECEIVED / CANCELLED) ─────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.CENTRAL_INVENTORY_MANAGER,
  )
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update purchase order status',
    description:
      'DRAFT → PLACED: marks order sent to supplier.\n' +
      'PLACED → RECEIVED: receives items into central warehouse stock, logs PURCHASE_RECEIPT movements, creates Expense record.\n' +
      'DRAFT → CANCELLED: cancels the order.',
  })
  async updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.procurementService.updateStatus(id, dto, user, ip);
  }
}
