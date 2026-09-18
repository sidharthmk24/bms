import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { CreditCopiesService } from '@/lib/services/credit-copies.service';

const creditCopiesService = new CreditCopiesService();

async function updateCreditCopyHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await creditCopiesService.updateCreditCopy(
      id,
      body,
      req.user,
      ipAddress
    );
    return apiSuccess(result);
  } catch (error: any) {
    console.error('CreditCopy PATCH Error:', error);
    return apiError(error);
  }
}

export const PATCH = withAuth(updateCreditCopyHandler);
