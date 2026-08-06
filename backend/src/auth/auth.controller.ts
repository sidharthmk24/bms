import {
  Controller,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
  Get,
  Patch,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class SetupPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access token and sets refresh token in an HTTP-only cookie.',
  })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const result = await this.authService.login(req.user, userAgent);

    // Set refresh token in httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access and refresh tokens using the refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Attempt to read from signed cookies, normal cookies, or body fallback
    const token = req.cookies?.refresh_token || req.body?.refreshToken;

    if (!token) {
      res.clearCookie('refresh_token', { path: '/' });
      throw new UnauthorizedException('No refresh token provided');
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const result = await this.authService.refresh(token, userAgent);

    // Set rotated refresh token in cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;

    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify if an email exists and its setup status' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email);
  }

  @Public()
  @Post('setup-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Setup password for newly created user' })
  async setupPassword(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: SetupPasswordDto,
  ) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const result = await this.authService.setupPassword(dto.email, dto.password, userAgent);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Standard secure response: return 200 even if email wasn't found
    return {
      message: 'If the email is registered in our system, a reset link will be logged to the server logs.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using the reset token' })
  async resetPassword(@Req() req: Request, @Body() dto: ResetPasswordDto) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.authService.resetPassword(dto, ip);
    return { message: 'Password reset successfully' };
  }

  @ApiBearerAuth('JWT')
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.userId, isActive: true },
      relations: ['branch', 'roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: currentUser.originalRoles ? currentUser.roles : user.roles?.map((r: any) => r.role) || [],
      primaryRole: currentUser.originalPrimaryRole ? currentUser.primaryRole : user.primaryRole,
      role: currentUser.originalPrimaryRole ? currentUser.primaryRole : user.primaryRole,
      originalRoles: currentUser.originalRoles,
      originalPrimaryRole: currentUser.originalPrimaryRole,
      originalRole: currentUser.originalPrimaryRole,
      branchId: currentUser.originalRoles ? currentUser.branchId : user.branchId,
      branch: user.branch
        ? {
            id: user.branch.id,
            name: user.branch.name,
            code: user.branch.code,
            type: user.branch.type,
          }
        : null,
    };
  }

  @ApiBearerAuth('JWT')
  @Post('impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Impersonate a different role (Super Admin only)' })
  async impersonate(
    @CurrentUser() currentUser: JwtPayload,
    @Body() body: { role: string; branchId?: string },
  ) {
    if (!body.role) {
      throw new UnauthorizedException('Role is required');
    }
    const result = await this.authService.impersonate(currentUser, body.role, body.branchId);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @ApiBearerAuth('JWT')
  @Patch('change-password')
  @ApiOperation({ summary: 'Change password for current logged-in user' })
  async changePassword(
    @Req() req: Request,
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.authService.changePassword(currentUser.userId, dto, ip);
    return { message: 'Password changed successfully' };
  }
}
