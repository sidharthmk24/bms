import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;
    const user = await authService.validateUser(email, password);
    if (!user) {
      return apiSuccess({ message: 'Invalid credentials' }, undefined, 401);
    }
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const result = await authService.login(user, userAgent);
    return apiSuccess(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}
