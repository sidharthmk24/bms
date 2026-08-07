import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { refreshToken } = body;
    if (refreshToken) await authService.logout(refreshToken);
    return apiSuccess({ message: 'Logged out successfully' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}
