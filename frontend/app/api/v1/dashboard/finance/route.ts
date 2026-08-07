import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/lib/services/dashboard.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withRoles([UserRole.FINANCE], async (req) => {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days')) || 30;
  return apiSuccess(await dashboardService.getFinanceDashboard(days));
});