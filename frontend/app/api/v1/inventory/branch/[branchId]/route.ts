import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import { withAuth } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getBranchInventory(p.branchId, query, user);
  return apiSuccess(data);
});

export const POST = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const body = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const data = await inventoryService.addBranchInventory(p.branchId, body, user, ipAddress);
  return apiSuccess(data);
});
