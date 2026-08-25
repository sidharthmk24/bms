import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

async function getStockByBookHandler(req: AuthenticatedRequest) {
  try {
    const bookId = req.nextUrl.searchParams.get('bookId');
    if (!bookId) {
      return apiError(new Error('bookId parameter is required'), 400);
    }
    
    const data = await transfersService.getStockByBook(bookId, req.user);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('Transfers Book Stock GET API Error:', error);
    return apiError(error);
  }
}

export const GET = withAuth(getStockByBookHandler);
