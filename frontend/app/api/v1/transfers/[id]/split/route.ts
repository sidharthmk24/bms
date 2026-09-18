import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const id = (await params).id;
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await transfersService.splitAndRouteTransfer(id, body, req.user, ip);
    return apiSuccess(result);
  } catch (error: any) {
    console.error('Transfers Split API Error:', error);
    return apiError(error);
  }
});
