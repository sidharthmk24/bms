import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const GET = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY], async (req: NextRequest, { user, params }) => {
  const branchId = (await params).branchId;
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getBranchInventory(branchId, query, user);
  return apiSuccess(data);
});

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const branchId = (await params).branchId;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await inventoryService.addBranchInventory(branchId, body, user, ip);
  return apiSuccess(data);
});
