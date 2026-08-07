import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import { withAuth } from '@/lib/middleware/withAuth';

const inventoryService = new InventoryService();

export const POST = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const body = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const data = await inventoryService.adjustBranchStock(p.branchId, p.bookId, body, user, ipAddress);
  return apiSuccess(data);
});
