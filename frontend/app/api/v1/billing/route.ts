import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/lib/services/billing.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const billingService = new BillingService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await billingService.getBills(query, user);
  return apiSuccess(data);
});