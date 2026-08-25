import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

async function dispatchHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    const data = await transfersService.dispatchTransfer(id, req.user, ipAddress);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('Transfers DISPATCH API Error:', error);
    return apiError(error);
  }
}

export const POST = withAuth(dispatchHandler);
