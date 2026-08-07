import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const branchId = (await params).branchId;
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getBranchInventoryLow(branchId, query, user);
  return apiSuccess(data);
});
