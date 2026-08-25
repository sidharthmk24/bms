import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

async function getTransferByIdHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const transfer = await transfersService.findOne(id, req.user);
    return apiSuccess(transfer);
  } catch (error: any) {
    console.error('Transfers GET ID API Error:', error);
    return apiError(error);
  }
}

export const GET = withAuth(getTransferByIdHandler);
