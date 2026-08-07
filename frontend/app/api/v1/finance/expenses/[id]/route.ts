import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/lib/services/finance.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const PATCH = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await financeService.updateExpense(p.id, body, user, ip);
  return apiSuccess(data);
});

export const DELETE = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  await financeService.deleteExpense(p.id, user, ip);
  return apiSuccess({ success: true });
});
