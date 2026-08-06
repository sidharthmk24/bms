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
import { BillingService } from './billing.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { CreateBillDto } from './dto/create-bill.dto';
import { GetBillsQueryDto } from './dto/get-bills-query.dto';
import { VoidBillDto } from './dto/void-bill.dto';

@ApiTags('Billing')
@ApiBearerAuth('JWT')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE)
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Checkout customer basket (completed sale)',
    description: 'Generates a bill, decrements store inventory atomically, and emits real-time events.',
  })
  @ApiResponse({ status: 201, description: 'Bill successfully generated' })
  async checkout(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBillDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.billingService.checkout(dto, user, ip);
  }

  @Get('bills')
  @ApiOperation({
    summary: 'List and search bills (paginated)',
    description: 'Branch users see only their branch. Chain managers can query all.',
  })
  async getBills(@Query() query: GetBillsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.billingService.getBills(query, user);
  }

  @Get('bills/:id')
  @ApiOperation({ summary: 'Get details of a single bill including line items' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.findOne(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
  @Patch('bills/:id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Void a completed bill (revert stock)',
    description: 'Voids the transaction and atomically returns the books back to store shelf stock.',
  })
  async voidBill(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: VoidBillDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.billingService.voidBill(id, dto.reason, user, ip);
  }
}
