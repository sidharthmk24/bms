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
import { CreateNewTitleRequestDto, ReviewNewTitleRequestDto } from './dto/new-title-request.dto';

@ApiTags('New Title Requests')
@ApiBearerAuth('JWT')
@Controller('new-title-requests')
export class NewTitleRequestsController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  // ── Create / Increment new title request ─────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.ADMIN,
    UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE, UserRole.BRANCH_INVENTORY,
    UserRole.CENTRAL_INVENTORY_MANAGER,
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or increment a new title request',
    description: 'If a PENDING request for the same freeTextTitle already exists, increments enquiryCount. Otherwise creates a new one.',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNewTitleRequestDto,
  ) {
    return this.enquiriesService.createNewTitleRequest(dto, user);
  }

  // ── List all new title requests ───────────────────────────────────────────────
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.ADMIN,
    UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.FINANCE,
  )
  @Get()
  @ApiOperation({
    summary: 'List all new title requests ordered by demand',
    description: 'Sorted by enquiryCount DESC — highest demand titles first.',
  })
  async findAll() {
    return this.enquiriesService.findAllNewTitleRequests();
  }

  // ── Review a new title request ────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or reject a new title request (admins only)',
    description: 'If approved, optionally link the createdBookId when the book has been added to the catalog.',
  })
  async review(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewNewTitleRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.enquiriesService.reviewNewTitleRequest(id, dto, user, ip);
  }
}
