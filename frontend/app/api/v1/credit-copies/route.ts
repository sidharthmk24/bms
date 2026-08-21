import { apiSuccess, apiError } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { CreditCopiesService } from '@/lib/services/credit-copies.service';

const creditCopiesService = new CreditCopiesService();

async function getCreditCopiesHandler(req: AuthenticatedRequest) {
  try {
    const data = await creditCopiesService.findAll(req.user);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('CreditCopies GET Error:', error);
    return apiError(error);
  }
}

async function createCreditCopyHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    const { bookId, quantity, recipientName, note, branchId } = body;
    
    const result = await creditCopiesService.issueCreditCopy(
      bookId,
      quantity,
      recipientName,
      note,
      req.user,
      branchId,
      ipAddress
    );
    return apiSuccess(result, undefined, 201);
  } catch (error: any) {
    console.error('CreditCopies POST Error:', error);
    return apiError(error);
  }
}

export const GET = withAuth(getCreditCopiesHandler);
export const POST = withAuth(createCreditCopyHandler);
