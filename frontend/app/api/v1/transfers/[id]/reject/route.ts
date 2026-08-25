import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { TransfersService } from '@/lib/services/transfers.service';

const transfersService = new TransfersService();

async function rejectHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    const data = await transfersService.rejectTransfer(id, body.note, req.user, ipAddress);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('Transfers REJECT API Error:', error);
    return apiError(error);
  }
}

export const POST = withAuth(rejectHandler);
