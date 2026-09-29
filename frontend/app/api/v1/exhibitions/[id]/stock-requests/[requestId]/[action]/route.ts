import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const POST = withAuth(async (req: NextRequest, context: any) => {
  const params = await context.params;
  const { id: exhibitionId, requestId, action } = params;
  const user = context.user;

  let result;
  if (action === 'review') {
    const body = await req.json();
    result = await exhibitionsService.reviewStockRequest(exhibitionId, requestId, body, user);
  } else if (action === 'dispatch') {
    result = await exhibitionsService.dispatchStockRequest(exhibitionId, requestId, user);
  } else if (action === 'receive') {
    result = await exhibitionsService.receiveStockRequest(exhibitionId, requestId, user);
  } else {
    return NextResponse.json(
      { success: false, error: { message: `Unknown action: ${action}` } },
      { status: 400 },
    );
  }

  return apiSuccess(result);
});
