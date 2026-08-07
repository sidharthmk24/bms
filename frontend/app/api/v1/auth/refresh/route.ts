import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { refreshToken } = body;
    if (!refreshToken) return apiSuccess({ message: 'Refresh token required' }, undefined, 400);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const result = await authService.refresh(refreshToken, userAgent);
    return apiSuccess(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}
