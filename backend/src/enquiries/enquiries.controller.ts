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
import { EnquiriesService } from './enquiries.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateEnquiryDto, UpdateEnquiryStatusDto } from './dto/enquiry.dto';
import { CreateNewTitleRequestDto, ReviewNewTitleRequestDto } from './dto/new-title-request.dto';

@ApiTags('Enquiries')
@ApiBearerAuth('JWT')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  // ── Log a new enquiry ─────────────────────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.ADMIN,
    UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE, UserRole.BRANCH_INVENTORY,
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Log a customer book enquiry',
    description: 'Provide either bookId (in catalog, out of stock) or freeTextTitle (not in catalog). Not both.',
  })
  async create(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEnquiryDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.enquiriesService.createEnquiry(dto, user, ip);
  }

  // ── List all enquiries ────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List enquiries (scoped by role)',
    description: 'Branch roles see only their branch. Chain roles see all.',
  })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.enquiriesService.findAllEnquiries(user);
  }

  // ── Demand summary ────────────────────────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.ADMIN,
    UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.FINANCE,
  )
  @Get('demand-summary')
  @ApiOperation({
    summary: 'Aggregated demand summary grouped by book across all branches',
    description: 'Key view for Central Inventory Manager. Shows which books have the most open enquiries across all branches.',
  })
  async demandSummary() {
    return this.enquiriesService.getDemandSummary();
  }

  // ── Update enquiry status ─────────────────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.ADMIN,
    UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE, UserRole.BRANCH_INVENTORY,
    UserRole.CENTRAL_INVENTORY_MANAGER,
  )
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update enquiry status',
    description: 'Transition an enquiry through: OPEN → STOCK_REQUESTED / NEW_TITLE_REQUESTED → FULFILLED / CLOSED.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enquiriesService.updateEnquiryStatus(id, dto, user);
  }
}
