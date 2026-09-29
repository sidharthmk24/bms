import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, context: any) => {
  const params = await context.params;
  const requests = await exhibitionsService.getStockRequests(params.id, context.user);
  return apiSuccess(requests);
});

export const POST = withAuth(async (req: NextRequest, context: any) => {
  const params = await context.params;
  const body = await req.json();
  const created = await exhibitionsService.createStockRequest(params.id, body, context.user);
  return apiSuccess(created, 'Stock request created', 201);
});
