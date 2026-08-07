import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/lib/services/finance.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE], async (req: NextRequest, { user }) => {
  const data = await financeService.findAllCashReconciliations(user);
  return apiSuccess(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = await financeService.createCashReconciliation(body, user);
  return apiSuccess(data);
});