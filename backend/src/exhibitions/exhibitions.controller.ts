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
import { ExhibitionsService } from './exhibitions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { ReviewExhibitionDto } from './dto/review-exhibition.dto';
import { CloseExhibitionDto } from './dto/close-exhibition.dto';

@ApiTags('Exhibitions')
@ApiBearerAuth('JWT')
@Controller('exhibitions')
export class ExhibitionsController {
  constructor(private readonly exhibitionsService: ExhibitionsService) {}

  // ── Request a new exhibition ──────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request a new exhibition (branch managers)',
    description: 'Creates an exhibition in REQUESTED status. Books + quantities are recorded but not yet deducted from branch inventory (that happens on dispatch).',
  })
  async create(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExhibitionDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.exhibitionsService.createExhibition(dto, user, ip);
  }

  // ── List exhibitions ──────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List all exhibitions (scoped by role)',
    description: 'Branch users only see their own branch exhibitions. Chain roles see all.',
  })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.exhibitionsService.findAll(user);
  }

  // ── Get single exhibition ────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get exhibition detail with stock lines' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exhibitionsService.findOne(id, user);
  }

  // ── Approve exhibition ────────────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_INVENTORY)
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve an exhibition request (admins only)',
    description: 'Changes status from REQUESTED → APPROVED. Stock is not moved yet.',
  })
  async approve(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewExhibitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.exhibitionsService.approveExhibition(id, dto, user, ip);
  }

  // ── Reject exhibition ─────────────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_INVENTORY)
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject an exhibition request (admins only)',
    description: 'Changes status from REQUESTED → REJECTED.',
  })
  async reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewExhibitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.exhibitionsService.rejectExhibition(id, dto, user, ip);
  }

  // ── Dispatch exhibition ───────────────────────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Post(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch stock to exhibition (branch inventory/managers)',
    description: 'Changes status APPROVED → ONGOING. Atomically decrements branch inventory and logs EXHIBITION_OUT movements.',
  })
  async dispatch(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.exhibitionsService.dispatchExhibition(id, user, ip);
  }

  // ── Close exhibition with reconciliation ─────────────────────────────────────
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY)
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close exhibition with stock reconciliation (branch inventory/managers)',
    description:
      'Changes status ONGOING → CLOSED. Enforces: quantityTaken = quantitySold + quantityReturned + quantityDamaged + quantityLost. ' +
      'Returns unsold/returned stock to branch inventory with EXHIBITION_RETURN movements. ' +
      'Logs ADJUSTMENT/DAMAGED and ADJUSTMENT/LOST entries for non-return discrepancies.',
  })
  async close(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CloseExhibitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.exhibitionsService.closeExhibition(id, dto, user, ip);
  }
}
