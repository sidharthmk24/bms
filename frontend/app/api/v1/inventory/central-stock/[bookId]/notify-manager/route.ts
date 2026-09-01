import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import { withAuth } from '@/lib/middleware/withAuth';

const inventoryService = new InventoryService();

export const POST = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const data = await inventoryService.notifyCentralManagerLowStock(p.bookId, user);
  return apiSuccess(data);
});
