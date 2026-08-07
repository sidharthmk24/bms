import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/lib/services/billing.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const billingService = new BillingService();

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await billingService.checkout(body, user, ip);
  return apiSuccess(data);
});