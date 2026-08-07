import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await exhibitionsService.findOne(p.id, user);
  return apiSuccess(data);
});
