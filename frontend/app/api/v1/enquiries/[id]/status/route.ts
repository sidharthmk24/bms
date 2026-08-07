import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '@/lib/services/enquiries.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const enquiriesService = new EnquiriesService();
export const PATCH = withAuth(async (req, { user, params }) => {
  const p = await params;
  const body = await req.json();
  return apiSuccess(await enquiriesService.updateEnquiryStatus(p.id, body, user));
});
