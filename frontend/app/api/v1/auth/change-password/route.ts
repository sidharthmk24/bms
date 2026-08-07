import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

const authService = new AuthService();

async function changePasswordHandler(authReq: AuthenticatedRequest) {
  try {
    const body = await authReq.json().catch(() => ({}));
    const ipAddress = authReq.headers.get('x-forwarded-for') || '127.0.0.1';
    await authService.changePassword(authReq.user.userId, body, ipAddress);
    return apiSuccess({ message: 'Password changed successfully' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}

export const POST = withAuth(changePasswordHandler);
