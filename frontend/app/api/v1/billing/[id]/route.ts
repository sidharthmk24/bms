import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/lib/services/billing.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const billingService = new BillingService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await billingService.findOne(p.id, user);
  return apiSuccess(data);
});
