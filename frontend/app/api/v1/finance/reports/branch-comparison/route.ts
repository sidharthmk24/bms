import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/lib/services/finance.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE], async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (!startDate || !endDate) return apiSuccess({ error: 'startDate and endDate required' }, undefined, 400);
  const data = await financeService.getBranchComparison(startDate, endDate);
  return apiSuccess(data);
});