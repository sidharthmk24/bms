import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

const authService = new AuthService();

async function impersonateHandler(authReq: AuthenticatedRequest) {
  try {
    const body = await authReq.json().catch(() => ({}));
    const { role, branchId } = body;
    const result = await authService.impersonate(authReq.user, role, branchId);
    return apiSuccess(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return apiError(new HttpError(status, error.message || 'Internal Server Error'));
  }
}

export const POST = withAuth(impersonateHandler);
