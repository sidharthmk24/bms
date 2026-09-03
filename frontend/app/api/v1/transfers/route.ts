import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getTransfersHandler(req: AuthenticatedRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const branchId = req.nextUrl.searchParams.get('branchId') || undefined;
    const page = req.nextUrl.searchParams.get('page') || undefined;
    const limit = req.nextUrl.searchParams.get('limit') || undefined;
    
    const data = await transfersService.getTransfers({ status, branchId, page, limit }, req.user);
    const res = apiSuccess(data);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  } catch (error: any) {
    console.error('Transfers GET API Error:', error);
    return apiError(error);
  }
}

async function createTransferHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    const data = await transfersService.createTransfer(body, req.user, ipAddress);
    return apiSuccess(data, undefined, 201);
  } catch (error: any) {
    console.error('Transfers POST API Error:', error);
    return apiError(error);
  }
}

export const GET = withAuth(getTransfersHandler);
export const POST = withAuth(createTransferHandler);
