import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const PATCH = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async (req: NextRequest, { user, params }) => {
  const body = await req.json();
  const bookId = (await params).bookId;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await inventoryService.updateCentralThreshold(bookId, body, user, ip);
  return apiSuccess(data);
});
