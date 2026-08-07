import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import {  withAuth, AuthenticatedRequest  } from '@/lib/middleware/withAuth';

const authService = new AuthService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  
  try {
    const body = await req.json().catch(() => ({}));

    switch (action) {
      case 'login': {
        const { email, password } = body;
        const user = await authService.validateUser(email, password);
        if (!user) {
          return apiSuccess({ message: 'Invalid credentials' }, undefined, 401);
        }
        const userAgent = req.headers.get('user-agent') || 'Unknown';
        const result = await authService.login(user, userAgent);
        return apiSuccess(result);
      }
      case 'refresh': {
        const { refreshToken } = body;
        if (!refreshToken) return apiSuccess({ message: 'Refresh token required' }, undefined, 400);
        const userAgent = req.headers.get('user-agent') || 'Unknown';
        const result = await authService.refresh(refreshToken, userAgent);
        return apiSuccess(result);
      }
      case 'logout': {
        const { refreshToken } = body;
        if (refreshToken) await authService.logout(refreshToken);
        return apiSuccess({ message: 'Logged out successfully' });
      }
      case 'forgot-password': {
        const { email } = body;
        if (!email) return apiSuccess({ message: 'Email required' }, undefined, 400);
        await authService.forgotPassword(email);
        return apiSuccess({ message: 'If that email is registered, a reset link was sent' });
      }
      case 'reset-password': {
        const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
        await authService.resetPassword(body, ipAddress);
        return apiSuccess({ message: 'Password has been reset successfully' });
      }
      case 'verify-email': {
        const { email } = body;
        if (!email) return apiSuccess({ message: 'Email required' }, undefined, 400);
        const result = await authService.verifyEmail(email);
        return apiSuccess(result);
      }
      case 'setup-password': {
        const { email, password } = body;
        const userAgent = req.headers.get('user-agent') || 'Unknown';
        const result = await authService.setupPassword(email, password, userAgent);
        return apiSuccess(result);
      }
      case 'impersonate': {
        return await withAuth(async (authReq: AuthenticatedRequest) => {
          const { role, branchId } = body;
          const result = await authService.impersonate(authReq.user, role, branchId);
          return apiSuccess(result);
        })(req as any, {});
      }
      case 'change-password': {
        return await withAuth(async (authReq: AuthenticatedRequest) => {
          const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
          await authService.changePassword(authReq.user.userId, body, ipAddress);
          return apiSuccess({ message: 'Password changed successfully' });
        })(req as any, {});
      }
      default:
        return apiSuccess({ message: 'Not Found' }, undefined, 404);
    }
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}
