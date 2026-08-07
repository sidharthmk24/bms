import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await authService.resetPassword(body, ipAddress);
    return apiSuccess({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}
