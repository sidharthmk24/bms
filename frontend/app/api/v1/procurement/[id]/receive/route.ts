import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ProcurementService } from '@/lib/services/procurement.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';
import { PurchaseOrderStatus } from '@/lib/api-backend/procurement/entities/purchase-order.entity';

const procurementService = new ProcurementService();

const handler = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const updateDto = { status: PurchaseOrderStatus.RECEIVED, ...body };
  const data = await procurementService.updateStatus(p.id, updateDto, user, ip);
  return apiSuccess(data);
});

// Frontend calls PATCH; keep POST as alias for backward compat
export const PATCH = handler;
export const POST = handler;
