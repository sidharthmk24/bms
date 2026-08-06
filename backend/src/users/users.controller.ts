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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users within permission scope',
    description: 'Super Admins and Admins list all users. Branch Managers see only staff in their own branch.',
  })
  @ApiResponse({ status: 200, description: 'Return list of users' })
  async findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific user within scope' })
  @ApiResponse({ status: 200, description: 'Return user details' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.usersService.findOne(id, currentUser);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new staff member',
    description: 'Admins and Branch Managers can only create user roles that are strictly below their own rank.',
  })
  @ApiResponse({ status: 201, description: 'User successfully created. Setup reset link logged to console.' })
  async create(
    @Req() req: Request,
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateUserDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.usersService.create(dto, currentUser, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member details' })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  async update(
    @Req() req: Request,
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.usersService.update(id, dto, currentUser, ip);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user account status (activate/deactivate)' })
  @ApiResponse({ status: 200, description: 'User status successfully updated' })
  async updateStatus(
    @Req() req: Request,
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { isActive: boolean },
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.usersService.updateStatus(id, dto.isActive, currentUser, ip);
    return { message: 'User status updated successfully' };
  }

  @Post(':id/send-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger setup or reset password link for staff' })
  @ApiResponse({ status: 200, description: 'Reset link generated and logged to console' })
  async sendReset(
    @Req() req: Request,
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.usersService.sendReset(id, currentUser, ip);
    return { message: 'Reset password link logged successfully' };
  }
}
