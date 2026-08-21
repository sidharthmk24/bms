import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/lib/services/finance.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER], async (req: NextRequest, { user }) => {
  const startDate = req.nextUrl.searchParams.get('startDate') || undefined;
  const endDate = req.nextUrl.searchParams.get('endDate') || undefined;
  
  const data = await financeService.findAllExpenses(user, startDate, endDate);
  return apiSuccess(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = await financeService.createExpense(body, user);
  return apiSuccess(data);
});