import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;
    if (!email) return apiSuccess({ message: 'Email required' }, undefined, 400);
    await authService.forgotPassword(email);
    return apiSuccess({ message: 'If that email is registered, a reset link was sent' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}
