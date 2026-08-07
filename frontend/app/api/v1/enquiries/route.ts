import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '@/lib/services/enquiries.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const enquiriesService = new EnquiriesService();

export const GET = withAuth(async (req, { user }) => apiSuccess(await enquiriesService.findAllEnquiries(user)));
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  return apiSuccess(await enquiriesService.createEnquiry(body, user, ip));
});