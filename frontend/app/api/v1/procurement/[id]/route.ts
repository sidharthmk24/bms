import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ProcurementService } from '@/lib/services/procurement.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const procurementService = new ProcurementService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  if (p.id === 'pms-titles') {
    const { PmsIntegrationService } = await import('@/lib/services/pms.service');
    const pmsService = new PmsIntegrationService();
    const data = await pmsService.getCompletedTitles();
    return apiSuccess(data);
  }
  const data = await procurementService.findOne(p.id);
  return apiSuccess(data);
});

export const PUT = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await procurementService.updateOrder(p.id, body, user, ip);
  return apiSuccess(data);
});

export const PATCH = PUT;

export const DELETE = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await procurementService.deleteOrder(p.id, user, ip);
  return apiSuccess(data);
});

