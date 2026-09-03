import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { BillingService } from '@/lib/services/billing.service';
import { withAuth } from '@/lib/middleware/withAuth';

const billingService = new BillingService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const data = await billingService.searchCustomers(q, user);
  return apiSuccess(data);
});
