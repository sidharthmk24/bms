import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Branches')
@ApiBearerAuth('JWT')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches' })
  @ApiResponse({ status: 200, description: 'Return list of all branches' })
  async findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific branch' })
  @ApiResponse({ status: 200, description: 'Return branch details' })
  async findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new branch (Super Admin/Admin only)' })
  @ApiResponse({ status: 201, description: 'Branch successfully created' })
  async create(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBranchDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.branchesService.create(dto, user.userId, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update branch details (Super Admin/Admin only)' })
  @ApiResponse({ status: 200, description: 'Branch successfully updated' })
  async update(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.branchesService.update(id, dto, user.userId, ip);
  }
}
