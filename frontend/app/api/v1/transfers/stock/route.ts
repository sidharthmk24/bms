import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

async function getSourceStockHandler(req: AuthenticatedRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const search = req.nextUrl.searchParams.get('search') || '';
    
    if (!branchId) {
      return apiError(new Error('branchId parameter is required'), 400);
    }
    
    const data = await transfersService.getBranchStockForTransfer(branchId, search, req.user);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('Transfers Stock GET API Error:', error);
    return apiError(error);
  }
}

export const GET = withAuth(getSourceStockHandler);
