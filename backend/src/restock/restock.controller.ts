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
import { RestockService } from './restock.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { CreateRestockRequestDto } from './dto/create-restock-request.dto';
import { ReviewRestockRequestDto } from './dto/review-restock-request.dto';
import { GetRestockRequestsQueryDto } from './dto/get-restock-requests-query.dto';

@ApiTags('Restock')
@ApiBearerAuth('JWT')
@Controller('restock-requests')
export class RestockController {
  constructor(private readonly restockService: RestockService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a new branch restock request (branch managers only)',
    description: 'Creates a pending request. Requires active branch context.',
  })
  async createRequest(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRestockRequestDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.restockService.createRequest(dto, user, ip);
  }

  @Get()
  @ApiOperation({
    summary: 'List and filter restock requests (paginated)',
    description: 'Branch users see only their branch. Chain managers can query all.',
  })
  async getRequests(@Query() query: GetRestockRequestsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.restockService.getRequests(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific restock request including line items' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.restockService.findOne(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or Reject a pending restock request (central managers only)',
    description: 'Marks status as APPROVED or REJECTED. Approval captures specific allocations per book.',
  })
  async reviewRequest(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewRestockRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.restockService.reviewRequest(id, dto, user, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Post(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch approved stock allocation from central warehouse (central managers only)',
    description: 'Marks request as FULFILLED. Atomically decrements central warehouse stock and logs TRANSFER_OUT movements.',
  })
  async dispatchRequest(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.restockService.dispatchRequest(id, user, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Acknowledge receipt of dispatched stock at destination branch (branch managers/staff only)',
    description: 'Marks request as RECEIVED. Atomically increments branch inventory stock and logs TRANSFER_IN movements.',
  })
  async receiveRequest(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.restockService.receiveRequest(id, user, ip);
  }
}
